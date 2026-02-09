import styled from '@emotion/styled';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconRobot, IconSend } from 'twenty-ui/display';
import { useLanguage } from '../i18n/LanguageContext';
import { FormattedMessage } from './FormattedMessage';

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;

const SidebarWrapper = styled.div<{ $width: number }>`
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-shrink: 0;
  width: ${({ $width }) => $width}px;
`;

const ResizeHandle = styled.div<{ $isDragging: boolean }>`
  width: 6px;
  cursor: col-resize;
  background-color: ${({ $isDragging, theme }) =>
    $isDragging ? theme.color.blue : 'transparent'};
  transition: background-color 0.15s ease;
  flex-shrink: 0;
  position: relative;
  z-index: 10;

  &:hover {
    background-color: ${({ theme }) => theme.color.blue};
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 32px;
    border-radius: 1px;
    background-color: ${({ $isDragging, theme }) =>
      $isDragging
        ? 'rgba(255, 255, 255, 0.6)'
        : theme.font.color.extraLight};
    transition: background-color 0.15s ease;
  }

  &:hover::after {
    background-color: rgba(255, 255, 255, 0.6);
  }
`;

const Sidebar = styled.aside`
  background-color: ${({ theme }) => theme.background.secondary};
  border-left: 1px solid ${({ theme }) => theme.border.color.medium};
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Title = styled.h3`
  font-size:     -eem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0;
`;

const Status = styled.span`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 1.375rem;
`;

const MessagesContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding: 1rem;
`;

const WelcomeMessage = styled.div`
  padding: 2rem 1rem;
  text-align: center;
`;

const WelcomeText = styled.p`
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 1.3125rem;
  margin-bottom: 1.5rem;
`;

const SuggestedQuestions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SuggestedButton = styled.button`
  background-color: ${({ theme }) => theme.background.tertiary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 0.75rem;
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 1rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.background.quaternary};
    border-color: ${({ theme }) => theme.color.blue};
  }
`;

const Message = styled.div<{ $isUser: boolean }>`
  align-items: ${({ $isUser }) => ($isUser ? 'flex-end' : 'flex-start')};
  display: flex;
  flex-direction: column;
`;

const MessageBubble = styled.div<{ $isUser: boolean }>`
  background-color: ${({ theme, $isUser }) =>
    $isUser ? theme.color.blue : theme.background.tertiary};
  color: ${({ theme, $isUser }) =>
    $isUser ? theme.font.color.inverted : theme.font.color.primary};
  padding: 0.75rem 1rem;
  border-radius: 12px;
  max-width: 80%;
  font-size: 1.3125rem;
  line-height: 1.5;
  word-wrap: break-word;
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 1rem;
  padding: 0.5rem;
`;

const InputContainer = styled.div`
  border-top: 1px solid ${({ theme }) => theme.border.color.medium};
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
`;

const Input = styled.input`
  flex: 1;
  background-color: ${({ theme }) => theme.background.tertiary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 0.75rem;
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 1.3125rem;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.blue};
  }

  &::placeholder {
    color: ${({ theme }) => theme.font.color.tertiary};
  }
`;

const SendButton = styled.button`
  background-color: ${({ theme }) => theme.color.blue};
  border: none;
  border-radius: 8px;
  padding: 0.75rem;
  color: ${({ theme }) => theme.font.color.inverted};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const getDefaultResponse = (q: string): string => {
  // 5. Vay ngân hàng / mortgage
  if (q.includes('vay') || q.includes('ngân hàng') || q.includes('trả góp') || q.includes('lãi suất')) {
    return `🏦 **Tính toán Vay Ngân hàng Mua nhà**

**Giả sử mua nhà 5 tỷ VNĐ**
💰 Vốn tự có (30%): **1.5 tỷ**
💳 Số tiền vay (70%): **3.5 tỷ**
📅 Thời hạn vay: 20 năm
📊 Lãi suất ưu đãi 2 năm đầu: 6.5%/năm
📊 Lãi suất sau ưu đãi: 10-12%/năm

**Ước tính trả hàng tháng**
🔹 2 năm đầu (ưu đãi): ~28.5 triệu/tháng
🔹 Từ năm thứ 3: ~38-42 triệu/tháng
🔹 Tổng lãi phải trả (20 năm): ~4.2 tỷ

**So sánh lãi suất các ngân hàng (T2/2026)**
🏛️ Vietcombank: 6.5% (ưu đãi) → 10.5%
🏛️ Techcombank: 6.9% (ưu đãi) → 11.0%
🏛️ BIDV: 6.3% (ưu đãi) → 10.2%
🏛️ VPBank: 7.5% (ưu đãi) → 11.5%
🏛️ ACB: 6.8% (ưu đãi) → 10.8%

💡 **Khuyến nghị**: Thu nhập hộ gia đình nên gấp 3 lần số tiền trả góp hàng tháng. Với khoản vay 3.5 tỷ, thu nhập tối thiểu nên từ 85-120 triệu/tháng.

⚠️ **Lưu ý**: Lãi suất ưu đãi chỉ áp dụng 1-2 năm đầu. Hãy tính toán khả năng trả nợ theo lãi suất thả nổi.`;
  }

  // 6. Quy trình mua nhà
  if (q.includes('quy trình') || q.includes('mua nhà') || q.includes('từ a-z') || q.includes('các bước')) {
    return `📝 **Quy trình Mua nhà từ A-Z**

**Giai đoạn 1 — Chuẩn bị (2-4 tuần)**
1️⃣ Xác định ngân sách & nhu cầu (vị trí, diện tích, loại hình)
2️⃣ Tìm hiểu thị trường, so sánh giá khu vực
3️⃣ Chuẩn bị hồ sơ vay ngân hàng (nếu cần)

**Giai đoạn 2 — Tìm kiếm (2-8 tuần)**
4️⃣ Tìm kiếm BĐS phù hợp trên marketplace
5️⃣ Đi xem thực tế ít nhất 5-10 căn
6️⃣ Kiểm tra pháp lý sơ bộ các căn tiềm năng

**Giai đoạn 3 — Đàm phán & Đặt cọc (1-2 tuần)**
7️⃣ Đàm phán giá với người bán
8️⃣ Thuê luật sư kiểm tra pháp lý chi tiết
9️⃣ Ký hợp đồng đặt cọc (thường 5-10% giá trị)

**Giai đoạn 4 — Hoàn tất (4-8 tuần)**
🔟 Hoàn thiện hồ sơ vay ngân hàng
📋 Ký hợp đồng mua bán công chứng
📋 Thanh toán theo tiến độ thỏa thuận
📋 Sang tên sổ đỏ/sổ hồng tại Văn phòng ĐKĐĐ
📋 Nhận bàn giao nhà/đất

**Chi phí phát sinh cần lưu ý**
💵 Thuế thu nhập cá nhân: 2% giá trị
💵 Lệ phí trước bạ: 0.5% giá trị
💵 Phí công chứng: 0.1% (tối đa 70 triệu)
💵 Phí sang tên: ~500,000 VNĐ

💡 **Khuyến nghị**: Toàn bộ quy trình thường mất 2-4 tháng. Nên dành thêm 5-8% giá trị BĐS cho các chi phí phát sinh.`;
  }

  // 7. Giá thuê / cho thuê
  if (q.includes('thuê') || q.includes('cho thuê') || q.includes('rental')) {
    return `🏠 **Phân tích Thị trường Cho thuê TP.HCM**

**Căn hộ cho thuê — Giá trung bình (T2/2026)**
🏢 Quận 1: 18-45 triệu/tháng (1-3PN)
🏢 Quận 2 (Thủ Đức): 12-30 triệu/tháng
🏢 Quận 7: 10-25 triệu/tháng
🏢 Bình Thạnh: 8-20 triệu/tháng
🏢 Quận 9 (Thủ Đức): 6-15 triệu/tháng

**Tỷ suất cho thuê (Rental Yield)**
📊 Căn hộ cao cấp Q1: 4-5%/năm
📊 Căn hộ trung cấp Q2: 5-6%/năm
📊 Căn hộ bình dân Q9: 6-7%/năm
📊 Nhà phố cho thuê: 3-4%/năm
📊 Đất nền Long Thành (cho thuê KCN): 7-9%/năm

**Xu hướng 2026**
📈 Nhu cầu thuê tăng 15% so với 2025
📈 Giá thuê căn hộ gần Metro tăng 20-25%
📈 Phân khúc serviced apartment tăng mạnh nhờ du lịch

💡 **Khuyến nghị**: Đầu tư cho thuê tốt nhất hiện tại là căn hộ 1-2PN gần trạm Metro, hoặc đất nền gần KCN Long Thành cho thuê xưởng/kho.`;
  }

  // 8. ROI / đầu tư sinh lời
  if (q.includes('đầu tư') || q.includes('sinh lời') || q.includes('roi') || q.includes('lợi nhuận')) {
    return `💹 **Phân tích ROI Đầu tư BĐS 2026**

**Top 5 khu vực đầu tư sinh lời cao nhất**

**1. Long Thành, Đồng Nai** ⭐⭐⭐⭐⭐
💰 Giá hiện tại: 18-25 triệu/m²
📈 Dự báo tăng giá: +40-60% (2026-2028)
🎯 ROI kỳ vọng: 20-30%/năm
✅ **Lý do**: Sân bay quốc tế, hạ tầng kết nối mạnh

**2. TP. Thủ Đức (Quận 2, 9)** ⭐⭐⭐⭐
💰 Giá hiện tại: 45-85 triệu/m²
📈 Dự báo tăng giá: +15-25% (2026-2028)
🎯 ROI kỳ vọng: 12-18%/năm
✅ **Lý do**: Metro số 1, khu công nghệ cao

**3. Nhơn Trạch, Đồng Nai** ⭐⭐⭐⭐
💰 Giá hiện tại: 12-20 triệu/m²
📈 Dự báo tăng giá: +25-35%
🎯 ROI kỳ vọng: 15-20%/năm
✅ **Lý do**: Cầu Nhơn Trạch, gần TP.HCM

**4. Bình Dương (Dĩ An, Thuận An)** ⭐⭐⭐
💰 Giá hiện tại: 30-50 triệu/m²
📈 Dự báo tăng giá: +10-18%
🎯 ROI kỳ vọng: 10-14%/năm

**5. Long An (Bến Lức, Cần Giuộc)** ⭐⭐⭐
💰 Giá hiện tại: 10-18 triệu/m²
📈 Dự báo tăng giá: +15-25%
🎯 ROI kỳ vọng: 12-16%/năm

⚠️ **Cảnh báo**: ROI cao đi kèm rủi ro cao. Luôn kiểm tra pháp lý và quy hoạch trước khi đầu tư.`;
  }

  // 9. Phong thủy
  if (q.includes('phong thủy') || q.includes('hướng nhà') || q.includes('tuổi')) {
    return `🧭 **Tư vấn Phong thủy Mua nhà**

**Hướng nhà tốt theo tuổi (Bát Trạch)**
🔴 Tuổi Tý, Thìn, Thân: Hướng Bắc, Đông Nam, Đông
🔵 Tuổi Sửu, Tỵ, Dậu: Hướng Tây, Tây Bắc, Tây Nam
🟢 Tuổi Dần, Ngọ, Tuất: Hướng Nam, Đông, Đông Bắc
🟡 Tuổi Mão, Mùi, Hợi: Hướng Đông, Nam, Bắc

**Nguyên tắc phong thủy cơ bản**
✅ Mặt tiền rộng, thoáng — đón khí tốt
✅ Không mua nhà cuối ngõ cụt
✅ Tránh nhà đối diện ngã ba, ngã tư
✅ Bếp không đối diện cửa chính
✅ Phòng ngủ chính ở vị trí yên tĩnh

**Hình dáng đất tốt**
🟢 Hình vuông, hình chữ nhật — Cân bằng, ổn định
🟢 Trước hẹp sau rộng — Càng ngày càng phát
🔴 Trước rộng sau hẹp — Tán tài
🔴 Hình tam giác — Bất ổn, hay xảy ra tranh chấp
🔴 Đất méo, lệch — Khó bố trí, phong thủy xấu

💡 **Khuyến nghị**: Phong thủy là yếu tố tham khảo. Ưu tiên pháp lý rõ ràng, vị trí thuận tiện và giá hợp lý trước khi xét phong thủy.`;
  }

  // 10. Scam / lừa đảo
  if (q.includes('lừa đảo') || q.includes('scam') || q.includes('cảnh báo') || q.includes('an toàn')) {
    return `🛡️ **Cảnh báo Lừa đảo BĐS — Cách Nhận biết & Phòng tránh**

**Top 5 chiêu lừa đảo phổ biến nhất**

🔴 **1. Bán đất không có sổ**
Dấu hiệu: Chỉ có giấy viết tay, hứa "sắp ra sổ"
⚠️ Rủi ro: Mất trắng tiền, không thể kiện

🔴 **2. Đất quy hoạch / đất công**
Dấu hiệu: Giá rẻ bất thường, "cần bán gấp"
⚠️ Rủi ro: Bị thu hồi, không được đền bù

🔴 **3. Một đất bán nhiều người**
Dấu hiệu: Giục đặt cọc nhanh, không cho kiểm tra sổ
⚠️ Rủi ro: Tranh chấp pháp lý kéo dài

🔴 **4. Dự án ma / phân lô trái phép**
Dấu hiệu: Quảng cáo hoành tráng, giá "mềm", chưa có giấy phép
⚠️ Rủi ro: Dự án không bao giờ triển khai

🔴 **5. Giả mạo chủ sở hữu**
Dấu hiệu: CCCD không khớp, ủy quyền mập mờ
⚠️ Rủi ro: Giao dịch vô hiệu

**Cách bảo vệ bản thân**
✅ Luôn kiểm tra sổ gốc tại Văn phòng ĐKĐĐ
✅ Yêu cầu xác minh CCCD chủ sở hữu
✅ Không đặt cọc khi chưa kiểm tra pháp lý
✅ Thuê luật sư đi cùng khi ký hợp đồng
✅ Giao dịch qua ngân hàng, không dùng tiền mặt

💡 **Khuyến nghị**: Sử dụng Trust Score trên marketplace để đánh giá độ tin cậy của tin đăng. Tin có Trust Score dưới 70% cần kiểm tra kỹ hơn.`;
  }

  // Default fallback
  return `Xin chào! Tôi là **Trợ lý AI** của Public Marketplace 🏠

Tôi có thể giúp bạn:
🔍 Tìm kiếm **hidden gems** với giá tốt nhất
📊 Phân tích thị trường & tiềm năng tăng giá
💡 So sánh các khu vực đầu tư
📈 Dự báo xu hướng bất động sản
⚖️ Tư vấn pháp lý mua bán
🏦 Tính toán vay ngân hàng
🧭 Tư vấn phong thủy
🛡️ Cảnh báo lừa đảo & rủi ro

Hãy thử hỏi tôi bất kỳ câu hỏi nào về bất động sản!`;
};

const getMockResponse = (input: string): string => {
  const q = input.toLowerCase();

  // 1. Hidden gem / Long Thành
  if (q.includes('hidden gem') || q.includes('long thành')) {
    return `🎯 **Phân tích Hidden Gems Long Thành**

Tôi đã quét 1,247 tin đăng và tìm thấy **3 cơ hội đầu tư** tiềm năng:

**1. Đất nền KDC Bàu Cạn — 2.2 tỷ**
💰 Giá: 2.2 tỷ (120m²) — **18.3 tr/m²**
📍 Cách sân bay: 6km | Mặt tiền đường 12m
⭐ Trust Score: 89% — Sổ hồng riêng
✅ **Ưu điểm**: Giá tốt nhất khu vực, hạ tầng hoàn thiện, gần trường học & chợ

**2. Đất nền gần sân bay — 2.8 tỷ**
💰 Giá: 2.8 tỷ (150m²) — **18.7 tr/m²**
📍 Cách sân bay: 3km — Vị trí đắc địa!
⭐ Trust Score: 92% — Sổ đỏ chính chủ
✅ **Ưu điểm**: Tiềm năng tăng giá cao khi sân bay hoạt động

**3. Đất nền Lộc An — 1.95 tỷ**
💰 Giá: 1.95 tỷ (100m²) — **19.5 tr/m²**
📍 Cách sân bay: 8km | Gần KCN Lộc An–Bình Sơn
⭐ Trust Score: 85% — Sổ hồng riêng
✅ **Ưu điểm**: Giá entry thấp, gần khu công nghiệp, cho thuê tốt

📊 **Dự báo**: Giá đất Long Thành có thể tăng 30-50% trong 2 năm tới khi sân bay đi vào hoạt động.

💡 **Khuyến nghị**: Lô #2 có vị trí tốt nhất, lô #3 phù hợp ngân sách hạn chế. Bạn muốn xem chi tiết lô nào?`;
  }

  // 2. So sánh khu vực
  if (q.includes('so sánh') || q.includes('vs') || q.includes('quận')) {
    return `📊 **So sánh Quận 2 vs Quận 7**

**Quận 2 (TP. Thủ Đức)**
💰 Giá TB căn hộ: 55–85 triệu/m²
📈 Tăng trưởng 2024: +15%/năm
🏢 Dự án nổi bật: Masteri, Gateway, Estella Heights
🚇 Hạ tầng: Metro số 1 sắp vận hành
🎓 Giáo dục: Trường quốc tế BIS, AIS
✅ **Ưu điểm**: Khu quốc tế, tiềm năng tăng giá mạnh

**Quận 7 (Phú Mỹ Hưng)**
💰 Giá TB căn hộ: 65–120 triệu/m²
📈 Tăng trưởng 2024: +12%/năm
🏢 Dự án nổi bật: Midtown, Scenic Valley, Riviera Point
🚗 Hạ tầng: Hoàn thiện, đường rộng thoáng
🏥 Tiện ích: Bệnh viện FV, SC VivoCity
✅ **Ưu điểm**: Hạ tầng hoàn thiện, an ninh tốt, cộng đồng ổn định

💡 **Khuyến nghị**: Quận 2 phù hợp đầu tư trung hạn (tiềm năng tăng giá cao nhờ Metro). Quận 7 phù hợp ở lâu dài & gia đình có con nhỏ.

⚠️ **Lưu ý**: Quận 2 đang có nhiều dự án mới, cần kiểm tra pháp lý kỹ trước khi mua.`;
  }

  // 3. Tiềm năng sân bay
  if (q.includes('tiềm năng') || q.includes('sân bay')) {
    return `🚀 **Phân tích Tiềm năng Khu vực Sân bay Long Thành**

**Tổng quan dự án**
📅 Khởi công: 2021 | Giai đoạn 1 hoàn thành: 2026
💼 Quy mô: 5,000 ha — 100 triệu khách/năm (khi hoàn thành)
💵 Tổng vốn đầu tư: 336,630 tỷ VNĐ (~16 tỷ USD)

**Tác động đến BĐS khu vực**
📈 Giá đất tăng trung bình: 30-50% (2024-2026)
🏗️ Hạ tầng kết nối: Cao tốc Bến Lức–Long Thành, Metro số 4
🏢 Khu công nghiệp: VSIP III, Lộc An–Bình Sơn thu hút FDI mạnh
🏘️ Đô thị vệ tinh: Quy hoạch 3 khu đô thị mới quanh sân bay

**Khu vực HOT nhất**
1️⃣ Bán kính 5km: Tăng giá 40-50% — Đất thổ cư khan hiếm
2️⃣ Mặt tiền QL51: Tiềm năng kinh doanh, cho thuê cao
3️⃣ KDC Bàu Cạn: Quy hoạch 1/500, pháp lý rõ ràng
4️⃣ Lộc An–Bình Sơn: Gần KCN, nhu cầu thuê lớn

💎 **Hidden Gems hiện tại**: 1.9–2.8 tỷ
🎯 **Dự báo 2027**: 3.5–5.0 tỷ (+60-80%)

💡 **Khuyến nghị**: Nên mua đất có sổ riêng, trong khu dân cư quy hoạch. Tránh đất nông nghiệp chưa chuyển đổi mục đích sử dụng.`;
  }

  // 4. Pháp lý
  if (q.includes('pháp lý') || q.includes('sổ đỏ') || q.includes('sổ hồng') || q.includes('giấy tờ')) {
    return `⚖️ **Tư vấn Pháp lý Mua Bất động sản**

**Các loại giấy tờ cần kiểm tra**
📋 Sổ đỏ / Sổ hồng (Giấy chứng nhận QSDĐ)
📋 Giấy phép xây dựng (nếu có nhà)
📋 Bản đồ quy hoạch 1/500
📋 Giấy xác nhận tình trạng thửa đất (không tranh chấp)
📋 Chứng minh nhân dân / CCCD chủ sở hữu

**Quy trình kiểm tra pháp lý**
1️⃣ Kiểm tra sổ tại Văn phòng đăng ký đất đai
2️⃣ Xác minh quy hoạch tại UBND huyện/quận
3️⃣ Kiểm tra tình trạng thế chấp ngân hàng
4️⃣ Xác nhận không tranh chấp, không bị kê biên
5️⃣ Kiểm tra nghĩa vụ tài chính (thuế, phí)

⚠️ **Cảnh báo — Dấu hiệu rủi ro pháp lý**
🔴 Đất chưa có sổ, chỉ có giấy viết tay
🔴 Đất nông nghiệp chưa chuyển đổi mục đích
🔴 Đất trong vùng quy hoạch treo
🔴 Chủ sở hữu không trùng khớp CCCD
🔴 Đất đang thế chấp ngân hàng

✅ **Dấu hiệu an toàn**
🟢 Sổ hồng/sổ đỏ chính chủ
🟢 Đất thổ cư 100%
🟢 Trong khu dân cư có quy hoạch 1/500
🟢 Đã đóng đầy đủ thuế, phí

💡 **Khuyến nghị**: Luôn thuê luật sư hoặc công chứng viên kiểm tra trước khi đặt cọc. Chi phí khoảng 2-5 triệu nhưng tránh được rủi ro hàng tỷ đồng.`;
  }

  return getDefaultResponse(q);
};

export const AIAssistantSidebar = () => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(DEFAULT_WIDTH);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartXRef.current = e.clientX;
      dragStartWidthRef.current = width;
    },
    [width],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      // Dragging left edge: moving mouse left = wider, moving right = narrower
      const delta = dragStartXRef.current - e.clientX;
      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, dragStartWidthRef.current + delta),
      );
      setWidth(newWidth);
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const suggestedQuestions = [
    'Tìm hidden gem đất nền Long Thành dưới 3 tỷ',
    'So sánh giá căn hộ Quận 2 vs Quận 7',
    'Phân tích tiềm năng tăng giá khu vực sân bay',
    'Tư vấn pháp lý mua đất nền',
    'Tính toán vay ngân hàng mua nhà 5 tỷ',
    'Quy trình mua nhà từ A-Z',
  ];

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    // Mock AI response demonstrating hidden gem discovery process
    setTimeout(() => {
      const responseContent = getMockResponse(input);

      const mockResponse: ChatMessage = {
        role: 'assistant',
        content: responseContent,
      };
      setMessages((prev) => [...prev, mockResponse]);
      setLoading(false);
    }, 1500);
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <SidebarWrapper $width={width}>
      <ResizeHandle $isDragging={isDragging} onMouseDown={handleMouseDown} />
      <Sidebar>
        <Header>
          <HeaderTitle>
            <IconRobot size={20} />
            <Title>{t('aiAssistant.title')}</Title>
          </HeaderTitle>
          <Status>{t('aiAssistant.status')}</Status>
        </Header>

        <MessagesContainer>
          {messages.length === 0 ? (
            <WelcomeMessage>
              <WelcomeText>
                {t('aiAssistant.welcome')}
              </WelcomeText>
              <SuggestedQuestions>
                {suggestedQuestions.map((question, index) => (
                  <SuggestedButton
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                  >
                    {question}
                  </SuggestedButton>
                ))}
              </SuggestedQuestions>
            </WelcomeMessage>
          ) : (
            <>
              {messages.map((message, index) => (
                <Message key={index} $isUser={message.role === 'user'}>
                  <MessageBubble $isUser={message.role === 'user'}>
                    {message.role === 'assistant' ? (
                      <FormattedMessage content={message.content} />
                    ) : (
                      message.content
                    )}
                  </MessageBubble>
                </Message>
              ))}
              {loading && (
                <LoadingIndicator>
                  <IconRobot size={16} />
                  {t('aiAssistant.thinking')}
                </LoadingIndicator>
              )}
            </>
          )}
        </MessagesContainer>

        <InputContainer>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('aiAssistant.placeholder')}
            disabled={loading}
          />
          <SendButton onClick={handleSend} disabled={loading || !input.trim()}>
            <IconSend size={20} />
          </SendButton>
        </InputContainer>
      </Sidebar>
    </SidebarWrapper>
  );
};
