export const translations = {
  en: {
    // Navigation
    'nav.browse': 'Browse',
    'nav.dashboard': 'Dashboard',
    'nav.postListing': 'Post Listing',
    'nav.inquiries': 'Inquiries',
    'nav.subscription': 'Subscription',
    'nav.profile': 'Profile',

    // Browse Page
    'browse.title': 'Public Marketplace',
    'browse.postButton': '+ Post Listing',
    'browse.searchPlaceholder': 'Search location, property type...',
    'browse.allCategories': 'All Categories',
    'browse.apartment': 'Apartment',
    'browse.house': 'House',
    'browse.land': 'Land',
    'browse.villa': 'Villa',
    'browse.featuredListings': 'Featured Listings',
    'browse.featured': '⭐ FEATURED',
    'browse.allListings': 'All Listings',
    'browse.property': 'Property',
    'browse.location': 'Location',
    'browse.price': 'Price',
    'browse.trust': 'Trust',

    // AI Assistant
    'ai.title': 'AI Assistant',
    'ai.status': 'Online',
    'ai.welcome': 'Hello! How can I help you with real estate?',
    'ai.placeholder': 'Type your question...',
    'ai.question1': 'Find hidden gem land in Long Thanh under 3B VND',
    'ai.question2': 'Compare apartment prices District 2 vs District 7',
    'ai.question3': 'Analyze airport area investment potential',

    // News Section
    'news.title': '📰 Real Estate News',
    'news.readTime': 'min read',

    // Common
    'common.bedrooms': 'BR',
    'common.bathrooms': 'BA',
    'common.area': 'm²',
    'common.featured': 'Featured',
  },
  vi: {
    // Navigation
    'nav.browse': 'Duyệt',
    'nav.dashboard': 'Bảng điều khiển',
    'nav.postListing': 'Đăng tin',
    'nav.inquiries': 'Yêu cầu',
    'nav.subscription': 'Gói dịch vụ',
    'nav.profile': 'Hồ sơ',

    // Browse Page
    'browse.title': 'Chợ Bất động sản',
    'browse.postButton': '+ Đăng tin',
    'browse.searchPlaceholder': 'Tìm kiếm địa điểm, loại bất động sản...',
    'browse.allCategories': 'Tất cả danh mục',
    'browse.apartment': 'Căn hộ',
    'browse.house': 'Nhà',
    'browse.land': 'Đất',
    'browse.villa': 'Biệt thự',
    'browse.featuredListings': 'Tin nổi bật',
    'browse.featured': '⭐ NỔI BẬT',
    'browse.allListings': 'Tất cả tin đăng',
    'browse.property': 'Bất động sản',
    'browse.location': 'Vị trí',
    'browse.price': 'Giá',
    'browse.trust': 'Tin cậy',

    // AI Assistant
    'ai.title': 'Trợ lý AI',
    'ai.status': 'Trực tuyến',
    'ai.welcome': 'Xin chào! Tôi có thể giúp gì cho bạn về bất động sản?',
    'ai.placeholder': 'Nhập câu hỏi của bạn...',
    'ai.question1': 'Tìm hidden gem đất nền Long Thành dưới 3 tỷ',
    'ai.question2': 'So sánh giá căn hộ Quận 2 vs Quận 7',
    'ai.question3': 'Phân tích tiềm năng tăng giá khu vực sân bay',

    // News Section
    'news.title': '📰 Tin tức Bất động sản',
    'news.readTime': 'phút đọc',

    // Common
    'common.bedrooms': 'PN',
    'common.bathrooms': 'PT',
    'common.area': 'm²',
    'common.featured': 'Nổi bật',
  },
};

export type TranslationKey = keyof typeof translations.en;
export type Language = keyof typeof translations;
