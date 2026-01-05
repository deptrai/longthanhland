type CalendarEventDataSeed = {
  id: string;
  title: string;
  isCanceled: boolean;
  isFullDay: boolean;
  startsAt: string;
  endsAt: string;
  externalCreatedAt: string;
  externalUpdatedAt: string;
  description: string;
  location: string;
  iCalUID: string;
  conferenceSolution: string;
  conferenceLinkPrimaryLinkLabel: string;
  conferenceLinkPrimaryLinkUrl: string;
};

export const CALENDAR_EVENT_DATA_SEED_COLUMNS: (keyof CalendarEventDataSeed)[] =
  [
    'id',
    'title',
    'isCanceled',
    'isFullDay',
    'startsAt',
    'endsAt',
    'externalCreatedAt',
    'externalUpdatedAt',
    'description',
    'location',
    'iCalUID',
    'conferenceSolution',
    'conferenceLinkPrimaryLinkLabel',
    'conferenceLinkPrimaryLinkUrl',
  ];

const GENERATE_CALENDAR_EVENT_IDS = (): Record<string, string> => {
  const CALENDAR_EVENT_IDS: Record<string, string> = {};

  for (let INDEX = 1; INDEX <= 800; INDEX++) {
    const HEX_INDEX = INDEX.toString(16).padStart(4, '0');

    CALENDAR_EVENT_IDS[`ID_${INDEX}`] =
      `20202020-${HEX_INDEX}-4e7c-8001-123456789cde`;
  }

  return CALENDAR_EVENT_IDS;
};

export const CALENDAR_EVENT_DATA_SEED_IDS = GENERATE_CALENDAR_EVENT_IDS();

const EVENT_TEMPLATES = [
  {
    title: 'Họp giao ban hàng ngày',
    description:
      'Cuộc họp đồng bộ hàng ngày để thảo luận tiến độ và các vấn đề cần giải quyết.',
    isFullDay: false,
    duration: 30, // minutes
    locations: ['Phòng họp A', 'Zalo', 'Zoom'],
    conferenceSolutions: ['Zalo', 'Zoom', 'Google Meet'],
  },
  {
    title: 'Thuyết trình dự án cho khách hàng',
    description:
      'Trình bày tiến độ dự án và các bước tiếp theo cho khách hàng.',
    isFullDay: false,
    duration: 60,
    locations: ['Văn phòng khách hàng', 'Zoom', 'Phòng họp B'],
    conferenceSolutions: ['Zoom', 'Zalo', 'Google Meet'],
  },
  {
    title: 'Họp lập kế hoạch dự án',
    description:
      'Phiên họp lập kế hoạch chiến lược cho các mốc quan trọng của dự án.',
    isFullDay: false,
    duration: 90,
    locations: ['Phòng họp C', 'Zoom', 'Phòng ban giám đốc'],
    conferenceSolutions: ['Zoom', 'Zalo', 'Google Meet'],
  },
  {
    title: 'Họp 1-1 với nhân viên',
    description:
      'Cuộc họp định kỳ để thảo luận về hiệu suất và phát triển nghề nghiệp.',
    isFullDay: false,
    duration: 45,
    locations: ['Văn phòng', 'Zoom', 'Quán cà phê'],
    conferenceSolutions: ['Zoom', 'Zalo', 'Google Meet'],
  },
  {
    title: 'Họp tư vấn bất động sản',
    description: 'Tư vấn khách hàng về các dự án bất động sản và căn hộ.',
    isFullDay: false,
    duration: 60,
    locations: ['Showroom', 'Zoom', 'Nhà mẫu'],
    conferenceSolutions: ['Zoom', 'Zalo', 'Google Meet'],
  },
  {
    title: 'Hội thảo lập kế hoạch chiến lược',
    description: 'Hội thảo lập kế hoạch chiến lược và thiết lập mục tiêu quý.',
    isFullDay: true,
    duration: 480, // 8 hours
    locations: ['Địa điểm ngoài', 'Trụ sở chính', 'Trung tâm hội nghị'],
    conferenceSolutions: ['Zoom', 'Zalo', 'Google Meet'],
  },
  {
    title: 'Đào tạo nhân viên',
    description: 'Phiên đào tạo phát triển chuyên môn và kỹ năng.',
    isFullDay: false,
    duration: 120,
    locations: ['Phòng đào tạo', 'Zoom', 'Zalo'],
    conferenceSolutions: ['Zoom', 'Zalo', 'Google Meet'],
  },
  {
    title: 'Gọi điện tìm hiểu khách hàng',
    description: 'Phỏng vấn khách hàng để thu thập phản hồi và hiểu nhu cầu.',
    isFullDay: false,
    duration: 45,
    locations: ['Điện thoại', 'Zoom', 'Zalo'],
    conferenceSolutions: ['Zoom', 'Zalo', 'Google Meet'],
  },
  {
    title: 'Họp xem xét ngân sách',
    description: 'Xem xét ngân sách quý và lập kế hoạch tài chính.',
    isFullDay: false,
    duration: 90,
    locations: ['Phòng tài chính', 'Phòng họp D', 'Zoom'],
    conferenceSolutions: ['Zoom', 'Zalo', 'Google Meet'],
  },
  {
    title: 'Demo sản phẩm bất động sản',
    description:
      'Trình diễn sản phẩm cho khách hàng tiềm năng và các bên liên quan.',
    isFullDay: false,
    duration: 60,
    locations: ['Phòng demo', 'Zoom', 'Nhà mẫu'],
    conferenceSolutions: ['Zoom', 'Zalo', 'Google Meet'],
  },
  {
    title: 'Họp toàn công ty',
    description: 'Cuộc họp toàn công ty để cập nhật và thông báo.',
    isFullDay: false,
    duration: 60,
    locations: ['Hội trường chính', 'Zoom', 'Zalo'],
    conferenceSolutions: ['Zoom', 'Zalo', 'Google Meet'],
  },
  {
    title: 'Họp đánh giá Sprint',
    description:
      'Đánh giá nhóm để thảo luận những gì đã làm tốt và cần cải thiện.',
    isFullDay: false,
    duration: 75,
    locations: ['Phòng họp E', 'Zalo', 'Zoom'],
    conferenceSolutions: ['Zalo', 'Zoom', 'Google Meet'],
  },
];

const GENERATE_CALENDAR_EVENT_SEEDS = (): CalendarEventDataSeed[] => {
  const CALENDAR_EVENT_SEEDS: CalendarEventDataSeed[] = [];

  for (let INDEX = 1; INDEX <= 800; INDEX++) {
    const TEMPLATE_INDEX = (INDEX - 1) % EVENT_TEMPLATES.length;
    const TEMPLATE = EVENT_TEMPLATES[TEMPLATE_INDEX];

    // Random date within the last 6 months and next 6 months
    const NOW = new Date();
    const RANDOM_DAYS_OFFSET = Math.floor(Math.random() * 365) - 182; // -182 to +182 days
    const EVENT_DATE = new Date(
      NOW.getTime() + RANDOM_DAYS_OFFSET * 24 * 60 * 60 * 1000,
    );

    // Random time between 9 AM and 6 PM
    const START_HOUR = 9 + Math.floor(Math.random() * 9);
    const START_MINUTE = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, or 45 minutes

    const START_TIME = new Date(EVENT_DATE);

    START_TIME.setHours(START_HOUR, START_MINUTE, 0, 0);

    const END_TIME = new Date(START_TIME);

    if (TEMPLATE.isFullDay) {
      END_TIME.setDate(END_TIME.getDate() + 1);
      END_TIME.setHours(0, 0, 0, 0);
    } else {
      END_TIME.setMinutes(END_TIME.getMinutes() + TEMPLATE.duration);
    }

    // Random location and conference solution
    const LOCATION =
      TEMPLATE.locations[Math.floor(Math.random() * TEMPLATE.locations.length)];
    const CONFERENCE_SOLUTION =
      TEMPLATE.conferenceSolutions[
        Math.floor(Math.random() * TEMPLATE.conferenceSolutions.length)
      ];

    // 5% chance of being cancelled
    const IS_CANCELLED = Math.random() < 0.05;

    // Generate conference link if it's an online meeting
    const CONFERENCE_LINK = ['Zoom', 'Teams', 'Google Meet'].includes(
      CONFERENCE_SOLUTION,
    )
      ? `https://${CONFERENCE_SOLUTION.toLowerCase().replace(' ', '')}.com/j/${Math.floor(Math.random() * 9000000000) + 1000000000}`
      : '';

    CALENDAR_EVENT_SEEDS.push({
      id: CALENDAR_EVENT_DATA_SEED_IDS[`ID_${INDEX}`],
      title: TEMPLATE.title,
      isCanceled: IS_CANCELLED,
      isFullDay: TEMPLATE.isFullDay,
      startsAt: START_TIME.toISOString(),
      endsAt: END_TIME.toISOString(),
      externalCreatedAt: new Date(
        START_TIME.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      externalUpdatedAt: new Date(
        START_TIME.getTime() - Math.random() * 24 * 60 * 60 * 1000,
      ).toISOString(),
      description: TEMPLATE.description,
      location: LOCATION,
      iCalUID: `event${INDEX}@calendar.twentycrm.com`,
      conferenceSolution: CONFERENCE_SOLUTION,
      conferenceLinkPrimaryLinkLabel: CONFERENCE_LINK,
      conferenceLinkPrimaryLinkUrl: CONFERENCE_LINK,
    });
  }

  return CALENDAR_EVENT_SEEDS;
};

export const CALENDAR_EVENT_DATA_SEEDS = GENERATE_CALENDAR_EVENT_SEEDS();
