// Việt hóa label propertyType + listingType cho user phổ thông (EXPERIENCE.md Voice & Tone).

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  land: 'Đất',
  house: 'Nhà',
  apartment: 'Căn hộ',
  commercial: 'Thương mại',
};

export const LISTING_TYPE_LABELS: Record<string, string> = {
  sell: 'Bán',
  rent: 'Cho thuê',
};

export function propertyTypeLabel(value: string): string {
  return PROPERTY_TYPE_LABELS[value] ?? value;
}

export function listingTypeLabel(value: string): string {
  return LISTING_TYPE_LABELS[value] ?? value;
}
