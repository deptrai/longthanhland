export interface ExecutiveStats {
  revenueMTD: number;
  revenueTarget: number;
  dealsClosed: number;
  dealsTarget: number;
  growthRate: number;
}

export interface ProjectPerformance {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  inventoryAvailable: number;
  inventoryTotal: number;
  status: 'on_track' | 'monitor' | 'planning';
}

export interface Leaderboard {
  rank: number;
  name: string;
  deals: number;
  revenue: number;
}

export interface PipelineHealth {
  conversionRate: number;
  teamAverage: number;
  avgDaysToClose: number;
  targetDays: number;
  activeDeals: number;
  dealValue: number;
}

export interface RevenueTrendPoint {
  month: string;
  value: number;
}

export const mockExecutiveStats: ExecutiveStats = {
  revenueMTD: 125500000000, // 125.5B
  revenueTarget: 150000000000, // 150B
  dealsClosed: 48,
  dealsTarget: 50,
  growthRate: 22,
};

export const mockProjectPerformance: ProjectPerformance[] = [
  {
    id: 'sunrise',
    name: 'Sunrise City',
    sales: 22,
    revenue: 55000000000, // 55B
    inventoryAvailable: 245,
    inventoryTotal: 500,
    status: 'on_track',
  },
  {
    id: 'greenhill',
    name: 'Green Hill',
    sales: 15,
    revenue: 45500000000, // 45.5B
    inventoryAvailable: 89,
    inventoryTotal: 200,
    status: 'monitor',
  },
  {
    id: 'oceanview',
    name: 'Ocean View',
    sales: 11,
    revenue: 25000000000, // 25B
    inventoryAvailable: 300,
    inventoryTotal: 300,
    status: 'planning',
  },
];

export const mockLeaderboard: Leaderboard[] = [
  {
    rank: 1,
    name: 'Luis Phan',
    deals: 12,
    revenue: 2275000000, // 2.275B
  },
  {
    rank: 2,
    name: 'John Doe',
    deals: 8,
    revenue: 1525000000, // 1.525B
  },
  {
    rank: 3,
    name: 'Jane Smith',
    deals: 5,
    revenue: 980000000, // 980M
  },
];

export const mockPipelineHealth: PipelineHealth = {
  conversionRate: 35,
  teamAverage: 28,
  avgDaysToClose: 18,
  targetDays: 14,
  activeDeals: 32,
  dealValue: 80000000000, // 80B
};

export const mockRevenueTrend: RevenueTrendPoint[] = [
  { month: 'Jan', value: 40000000000 },
  { month: 'Feb', value: 45000000000 },
  { month: 'Mar', value: 60000000000 },
  { month: 'Apr', value: 70000000000 },
  { month: 'May', value: 75000000000 },
  { month: 'Jun', value: 85000000000 },
  { month: 'Jul', value: 90000000000 },
  { month: 'Aug', value: 95000000000 },
  { month: 'Sep', value: 105000000000 },
  { month: 'Oct', value: 115000000000 },
  { month: 'Nov', value: 120000000000 },
  { month: 'Dec', value: 125500000000 },
];

// Plot Map Data
export interface PlotProperty {
  id: string;
  plotId: string;
  blockId: string;
  status: 'available' | 'reserved' | 'deposit' | 'sold';
  area: number;
  price: number;
  coordinates: string; // SVG polygon points
}

export const mockPlotProperties: PlotProperty[] = [
  // Block A
  {
    id: 'a001',
    plotId: 'A-001',
    blockId: 'A',
    status: 'available',
    area: 120,
    price: 2500000000,
    coordinates: '50,50 150,50 150,150 50,150',
  },
  {
    id: 'a002',
    plotId: 'A-002',
    blockId: 'A',
    status: 'reserved',
    area: 150,
    price: 3000000000,
    coordinates: '160,50 260,50 260,150 160,150',
  },
  {
    id: 'a003',
    plotId: 'A-003',
    blockId: 'A',
    status: 'deposit',
    area: 120,
    price: 2500000000,
    coordinates: '270,50 370,50 370,150 270,150',
  },
  {
    id: 'a004',
    plotId: 'A-004',
    blockId: 'A',
    status: 'sold',
    area: 180,
    price: 4000000000,
    coordinates: '380,50 480,50 480,150 380,150',
  },
  {
    id: 'a005',
    plotId: 'A-005',
    blockId: 'A',
    status: 'available',
    area: 150,
    price: 3000000000,
    coordinates: '490,50 590,50 590,150 490,150',
  },

  // Block B
  {
    id: 'b001',
    plotId: 'B-001',
    blockId: 'B',
    status: 'available',
    area: 200,
    price: 5000000000,
    coordinates: '50,170 150,170 150,290 50,290',
  },
  {
    id: 'b002',
    plotId: 'B-002',
    blockId: 'B',
    status: 'available',
    area: 150,
    price: 3800000000,
    coordinates: '160,170 260,170 260,290 160,290',
  },
  {
    id: 'b003',
    plotId: 'B-003',
    blockId: 'B',
    status: 'reserved',
    area: 180,
    price: 4500000000,
    coordinates: '270,170 370,170 370,290 270,290',
  },
  {
    id: 'b004',
    plotId: 'B-004',
    blockId: 'B',
    status: 'available',
    area: 160,
    price: 4000000000,
    coordinates: '380,170 480,170 480,290 380,290',
  },
  {
    id: 'b005',
    plotId: 'B-005',
    blockId: 'B',
    status: 'available',
    area: 180,
    price: 4500000000,
    coordinates: '490,170 590,170 590,290 490,290',
  },

  // Block C
  {
    id: 'c001',
    plotId: 'C-001',
    blockId: 'C',
    status: 'available',
    area: 220,
    price: 5500000000,
    coordinates: '50,310 220,310 220,450 50,450',
  },
  {
    id: 'c002',
    plotId: 'C-002',
    blockId: 'C',
    status: 'sold',
    area: 200,
    price: 5000000000,
    coordinates: '230,310 400,310 400,450 230,450',
  },
  {
    id: 'c003',
    plotId: 'C-003',
    blockId: 'C',
    status: 'available',
    area: 210,
    price: 5200000000,
    coordinates: '410,310 590,310 590,450 410,450',
  },
];
