import { translations } from '../i18n/translations';

export type Language = 'en' | 'vi';

/**
 * Translate trust score factor names and details
 */
export const translateTrustFactor = (
  key: string,
  language: Language = 'vi',
): string => {
  const t = translations[language];

  // Map English factor names to translation keys
  const factorMap: Record<string, string> = {
    'Seller Verification': t.trustFactors.sellerVerification,
    'Listing Quality': t.trustFactors.listingQuality,
    'Market Price Analysis': t.trustFactors.marketPriceAnalysis,
    'Location Verification': t.trustFactors.locationVerification,
    'Property Authenticity': t.trustFactors.propertyAuthenticity,
    'Legal Compliance': t.trustFactors.legalCompliance,
    'Infrastructure Score': t.trustFactors.infrastructureScore,
    'Environmental Factors': t.trustFactors.environmentalFactors,
    'Engagement Metrics': t.trustFactors.engagement,
    'Platform History': t.trustFactors.platformHistory,
  };

  return factorMap[key] || key;
};

/**
 * Translate trust score detail strings
 */
export const translateTrustDetail = (
  detail: string,
  language: Language = 'vi',
): string => {
  const t = translations[language];

  // Handle dynamic content with regex patterns
  if (detail.includes('Phone verified')) {
    return detail.replace('Phone verified', t.trustFactors.phoneVerified);
  }
  if (detail.includes('Email verified')) {
    return detail.replace('Email verified', t.trustFactors.emailVerified);
  }
  if (detail.includes('ID not verified')) {
    return detail.replace('ID not verified', t.trustFactors.idNotVerified);
  }
  if (detail.includes('All required fields filled')) {
    return detail.replace('All required fields filled', t.trustFactors.allFieldsFilled);
  }
  if (detail.includes('images uploaded')) {
    const match = detail.match(/(\d+) images uploaded/);
    if (match) {
      return `${match[1]} ${t.trustFactors.imagesUploaded}`;
    }
  }
  if (detail.includes('Professional photos detected by AI')) {
    return detail.replace('Professional photos detected by AI', t.trustFactors.professionalPhotos);
  }
  if (detail.includes('Standard photo quality')) {
    return detail.replace('Standard photo quality', t.trustFactors.standardPhotos);
  }
  if (detail.includes('Price within 20% of market average')) {
    return detail.replace('Price within 20% of market average', t.trustFactors.priceWithinRange);
  }
  if (detail.includes('Price outside market range')) {
    return detail.replace('Price outside market range', t.trustFactors.priceOutsideRange);
  }
  if (detail.includes('Analyzed 30+ similar properties')) {
    return detail.replace('Analyzed 30+ similar properties', t.trustFactors.analyzedProperties);
  }
  if (detail.includes('Market data confidence')) {
    return detail.replace('Market data confidence: 85%', t.trustFactors.marketConfidence);
  }
  if (detail.includes('GPS coordinates match address')) {
    return detail.replace('GPS coordinates match address', t.trustFactors.gpsMatch);
  }
  if (detail.includes('Street view verified by AI')) {
    return detail.replace('Street view verified by AI', t.trustFactors.streetViewVerified);
  }
  if (detail.includes('No duplicate images found')) {
    return detail.replace('No duplicate images found', t.trustFactors.noDuplicates);
  }
  if (detail.includes('Unique listing verified')) {
    return detail.replace('Unique listing verified', t.trustFactors.uniqueListing);
  }
  if (detail.includes('Valid property documents')) {
    return detail.replace('Valid property documents', t.trustFactors.validDocuments);
  }
  if (detail.includes('No legal disputes found')) {
    return detail.replace('No legal disputes found', t.trustFactors.noDisputes);
  }
  if (detail.includes('2-3 schools within 2km')) {
    return detail.replace('2-3 schools within 2km', t.trustFactors.schoolsNearby);
  }
  if (detail.includes('Metro station 500-800m')) {
    return detail.replace('Metro station 500-800m', t.trustFactors.metroNearby);
  }
  if (detail.includes('All utilities available')) {
    return detail.replace('All utilities available', t.trustFactors.utilitiesAvailable);
  }
  if (detail.includes('Low flood risk area')) {
    return detail.replace('Low flood risk area', t.trustFactors.lowFloodRisk);
  }
  if (detail.includes('Good air quality index')) {
    return detail.replace('Good air quality index', t.trustFactors.goodAirQuality);
  }
  if (detail.includes('views')) {
    const match = detail.match(/(\d+) views/);
    if (match) {
      return `${match[1]} ${t.trustFactors.views}`;
    }
  }
  if (detail.includes('inquiries')) {
    const match = detail.match(/(\d+) inquiries/);
    if (match) {
      return `${match[1]} ${t.trustFactors.inquiries}`;
    }
  }
  if (detail.includes('Account age: 30-60 days')) {
    return detail.replace('Account age: 30-60 days', t.trustFactors.accountAge);
  }
  if (detail.includes('1-2 previous listings')) {
    return detail.replace('1-2 previous listings', t.trustFactors.previousListings);
  }

  return detail;
};
