'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

// Story 3.2 — Multi-step listing form (4 bước).
// Bước 1: Thông tin (title, description, price, area, propertyType, listingType)
// Bước 2: Vị trí (province, district, ward, street, address)
// Bước 3: Hình ảnh (upload ≤10 ảnh, mỗi ảnh ≤10MB, WebP auto)
// Bước 4: Xem lại + submit → PENDING

type FormData = {
  listingType: 'sell' | 'rent';
  title: string;
  description: string;
  price: string;
  area: string;
  propertyType: 'land' | 'house' | 'apartment' | 'commercial' | 'project';
  province: string;
  district: string;
  ward: string;
  street: string;
  address: string;
  bedrooms: string;
  bathrooms: string;
  floorCount: string;
  legalStatus: string;
  images: Array<{ url: string; isCover: boolean }>;
};

const EMPTY_FORM: FormData = {
  listingType: 'sell',
  title: '',
  description: '',
  price: '',
  area: '',
  propertyType: 'land',
  province: '',
  district: '',
  ward: '',
  street: '',
  address: '',
  bedrooms: '',
  bathrooms: '',
  floorCount: '',
  legalStatus: '',
  images: [],
};

const DRAFT_KEY = 'bdsai-listing-draft';
const MAX_IMAGES = 10;

export default function DangTinPage() {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const submitLockRef = useRef(false);

  // AC: draft tự lưu sau mỗi bước (localStorage). Restore on mount via useState initializer (no setState-in-effect).
  const [form, setForm] = useState<FormData>(() => {
    if (typeof window === 'undefined') return EMPTY_FORM;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return EMPTY_FORM;
    try {
      const parsed = JSON.parse(saved) as FormData;
      if (parsed.title || parsed.description || parsed.images.length > 0) {
        if (confirm('Bạn có tin nháp chưa hoàn thành. Tiếp tục?')) {
          return { ...EMPTY_FORM, ...parsed };
        }
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
    return EMPTY_FORM;
  });

  // Auto-save draft khi form thay đổi.
  useEffect(() => {
    if (form !== EMPTY_FORM) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }
  }, [form]);

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateStep = (stepNum: number): boolean => {
    const errs: Record<string, string> = {};
    if (stepNum === 1) {
      if (form.title.trim().length < 5) errs['title'] = 'Tiêu đề tối thiểu 5 ký tự';
      if (form.description.trim().length < 10) errs['description'] = 'Mô tả tối thiểu 10 ký tự';
      if (!form.price || Number(form.price) <= 0) errs['price'] = 'Giá phải lớn hơn 0';
      if (!form.area || Number(form.area) <= 0) errs['area'] = 'Diện tích phải lớn hơn 0';
    } else if (stepNum === 2) {
      if (!form.province.trim()) errs['province'] = 'Tỉnh/thành phố bắt buộc';
      if (!form.district.trim()) errs['district'] = 'Quận/huyện bắt buộc';
      if (!form.address.trim()) errs['address'] = 'Địa chỉ bắt buộc';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 4));
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // AC: ảnh upload trực tiếp Supabase Storage qua API, ≤10 ảnh, mỗi ảnh ≤10MB.
  const handleImageUpload = async (files: FileList) => {
    if (form.images.length + files.length > MAX_IMAGES) {
      setSubmitError(`Tối đa ${MAX_IMAGES} ảnh`);
      return;
    }
    setUploading(true);
    setSubmitError('');
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setSubmitError('Vui lòng đăng nhập lại');
      setUploading(false);
      return;
    }
    try {
      const newImages: Array<{ url: string; isCover: boolean }> = [];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          setSubmitError(`Ảnh ${file.name} vượt quá 10MB`);
          continue;
        }
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload/listing-image', {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setSubmitError(err.message ?? 'Upload ảnh thất bại');
          continue;
        }
        const data = (await res.json()) as { url: string; isCover: boolean };
        newImages.push({ url: data.url, isCover: form.images.length === 0 && newImages.length === 0 });
      }
      setForm((prev) => ({ ...prev, images: [...prev.images, ...newImages] }));
    } catch {
      setSubmitError('Upload ảnh thất bại, thử lại');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    setForm((prev) => {
      const images = prev.images.filter((_, i) => i !== idx);
      // Ensure first image is cover.
      if (images.length > 0) images[0]!.isCover = true;
      return { ...prev, images };
    });
  };

  const setCoverImage = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => ({ ...img, isCover: i === idx })),
    }));
  };

  // AC: double-click "Đăng tin" không tạo tin trùng (idempotency — submitLockRef).
  const handleSubmit = async () => {
    if (submitLockRef.current) return;
    if (!validateStep(1) || !validateStep(2)) {
      setStep(1);
      return;
    }
    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setSubmitError('Vui lòng đăng nhập lại');
      setSubmitting(false);
      submitLockRef.current = false;
      return;
    }
    try {
      // Step 1: create listing (DRAFT).
      const createRes = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          listingType: form.listingType,
          title: form.title,
          description: form.description,
          price: Number(form.price),
          area: Number(form.area),
          propertyType: form.propertyType,
          province: form.province,
          district: form.district,
          ward: form.ward || undefined,
          street: form.street || undefined,
          address: form.address,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
          floorCount: form.floorCount ? Number(form.floorCount) : undefined,
          legalStatus: form.legalStatus || undefined,
          images: form.images,
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.message ?? 'Tạo tin thất bại');
      }
      const listing = (await createRes.json()) as { id: string };

      // Step 2: submit (DRAFT → PENDING).
      const submitRes = await fetch(`/api/marketplace/listings/${listing.id}/submit`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({}));
        throw new Error(err.message ?? 'Gửi duyệt thất bại');
      }

      setSubmitSuccess(true);
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Đăng tin thất bại');
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  };

  if (submitSuccess) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <h2 className="text-xl font-bold text-green-800">Đăng tin thành công!</h2>
          <p className="mt-2 text-green-700">Tin của bạn đang chờ duyệt. Chúng tôi sẽ thông báo khi tin được hiển thị.</p>
          <button
            onClick={() => {
              setForm(EMPTY_FORM);
              setStep(1);
              setSubmitSuccess(false);
            }}
            className="mt-4 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Đăng tin mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="mb-6 text-2xl font-bold">Đăng tin bất động sản</h1>

      {/* Progress indicator */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                s <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s}
            </div>
            {s < 4 && <div className={`h-1 w-12 ${s < step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {submitError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
          {submitError}
        </div>
      )}

      {/* Step 1: Thông tin */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Thông tin cơ bản</h2>
          <div>
            <label className="block text-sm font-medium">Loại giao dịch</label>
            <select
              value={form.listingType}
              onChange={(e) => updateField('listingType', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="sell">Bán</option>
              <option value="rent">Cho thuê</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Tiêu đề *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              maxLength={200}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="VD: Đất nền Long Thành, sổ đỏ, 100m2"
            />
            {errors['title'] && <p className="mt-1 text-sm text-red-600">{errors['title']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Mô tả *</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              maxLength={5000}
              rows={5}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Mô tả chi tiết về bất động sản..."
            />
            {errors['description'] && <p className="mt-1 text-sm text-red-600">{errors['description']}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Giá (VND) *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="2000000000"
              />
              {errors['price'] && <p className="mt-1 text-sm text-red-600">{errors['price']}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Diện tích (m²) *</label>
              <input
                type="number"
                value={form.area}
                onChange={(e) => updateField('area', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="100"
              />
              {errors['area'] && <p className="mt-1 text-sm text-red-600">{errors['area']}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Loại BĐS</label>
            <select
              value={form.propertyType}
              onChange={(e) => updateField('propertyType', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="land">Đất</option>
              <option value="house">Nhà phố</option>
              <option value="apartment">Chung cư</option>
              <option value="commercial">Thương mại</option>
              <option value="project">Dự án</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Phòng ngủ</label>
              <input
                type="number"
                value={form.bedrooms}
                onChange={(e) => updateField('bedrooms', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Phòng tắm</label>
              <input
                type="number"
                value={form.bathrooms}
                onChange={(e) => updateField('bathrooms', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Số tầng</label>
              <input
                type="number"
                value={form.floorCount}
                onChange={(e) => updateField('floorCount', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Pháp lý</label>
            <input
              type="text"
              value={form.legalStatus}
              onChange={(e) => updateField('legalStatus', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="VD: Sổ đỏ, sổ hồng..."
            />
          </div>
        </div>
      )}

      {/* Step 2: Vị trí */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Vị trí</h2>
          <div>
            <label className="block text-sm font-medium">Tỉnh/Thành phố *</label>
            <input
              type="text"
              value={form.province}
              onChange={(e) => updateField('province', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="VD: Đồng Nai"
            />
            {errors['province'] && <p className="mt-1 text-sm text-red-600">{errors['province']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Quận/Huyện *</label>
            <input
              type="text"
              value={form.district}
              onChange={(e) => updateField('district', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="VD: Long Thành"
            />
            {errors['district'] && <p className="mt-1 text-sm text-red-600">{errors['district']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Phường/Xã</label>
            <input
              type="text"
              value={form.ward}
              onChange={(e) => updateField('ward', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Đường</label>
            <input
              type="text"
              value={form.street}
              onChange={(e) => updateField('street', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Địa chỉ đầy đủ *</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="VD: Khu phố 1, Long Thành, Đồng Nai"
            />
            {errors['address'] && <p className="mt-1 text-sm text-red-600">{errors['address']}</p>}
          </div>
        </div>
      )}

      {/* Step 3: Hình ảnh */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Hình ảnh (tối đa {MAX_IMAGES} ảnh, mỗi ảnh ≤ 10MB)</h2>
          <div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
              disabled={uploading || form.images.length >= MAX_IMAGES}
              className="block w-full text-sm"
            />
            {uploading && <p className="mt-2 text-sm text-blue-600">Đang tải ảnh...</p>}
          </div>
          {form.images.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {form.images.map((img, idx) => (
                <div key={idx} className="relative">
                  <Image
                    src={img.url}
                    alt={`Ảnh ${idx + 1}`}
                    width={200}
                    height={128}
                    className="h-32 w-full rounded-md object-cover"
                    unoptimized
                  />
                  {img.isCover && (
                    <span className="absolute left-1 top-1 rounded bg-blue-600 px-2 py-0.5 text-xs text-white">
                      Ảnh bìa
                    </span>
                  )}
                  <div className="mt-1 flex gap-2">
                    {!img.isCover && (
                      <button
                        onClick={() => setCoverImage(idx)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Đặt làm bìa
                      </button>
                    )}
                    <button
                      onClick={() => removeImage(idx)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500">Ảnh đầu tiên sẽ được dùng làm ảnh bìa.</p>
        </div>
      )}

      {/* Step 4: Xem lại */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Xem lại thông tin</h2>
          <dl className="divide-y divide-gray-200 rounded-md border border-gray-200">
            <ReviewRow label="Loại giao dịch" value={form.listingType === 'sell' ? 'Bán' : 'Cho thuê'} />
            <ReviewRow label="Tiêu đề" value={form.title} />
            <ReviewRow label="Giá" value={`${Number(form.price).toLocaleString('vi-VN')} VND`} />
            <ReviewRow label="Diện tích" value={`${form.area} m²`} />
            <ReviewRow label="Loại BĐS" value={form.propertyType} />
            <ReviewRow label="Địa chỉ" value={`${form.address}, ${form.district}, ${form.province}`} />
            <ReviewRow label="Pháp lý" value={form.legalStatus || '—'} />
            <ReviewRow label="Số ảnh" value={String(form.images.length)} />
          </dl>
          <div>
            <h3 className="text-sm font-medium">Mô tả:</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{form.description}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={prevStep}
          disabled={step === 1}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
        >
          Quay lại
        </button>
        {step < 4 ? (
          <button
            onClick={nextStep}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700"
          >
            Tiếp tục
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-green-600 px-6 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Đang đăng...' : 'Đăng tin'}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-2 text-sm">
      <dt className="font-medium text-gray-600">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}
