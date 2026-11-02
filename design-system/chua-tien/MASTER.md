# Design System: Chùa Tiên (Chua Tien Virtual Pagoda)

**Status:** Global Source of Truth (Master)  
**Product Type:** Virtual Sacred Pagoda / 360° Spiritual Hall & Meditation Space  
**Aesthetic Style:** Sacred Oriental Dark Mode / Lacquer & Gilded Gold / Glassmorphism HUD  
**Target Audience:** Phật tử, đạo hữu, người muốn tìm chốn bình yên, tịnh tâm thiền định qua không gian số.  

---

## 1. Color Palette Tokens

| Token Name | Hex Value | Role & Usage | Contrast Ratio |
|------------|-----------|--------------|----------------|
| `--color-bg-base` | `#120705` | Nền chính không gian điện tối cổ kính | >12:1 vs text |
| `--color-bg-surface` | `rgba(26, 12, 9, 0.82)` | Mặt nền bảng điều khiển, thẻ HUD, drawer | Backdrop blur 16px |
| `--color-bg-card` | `rgba(45, 19, 13, 0.75)` | Thẻ tin nhắn, danh sách ghế ngồi | Border subtle |
| `--color-primary-gold` | `#D4A640` | Vàng tượng Phật dát vàng, điểm nhấn linh thiêng | 5.2:1 vs dark bg |
| `--color-gold-bright` | `#F59E0B` | Hào quang Phật, nút hành động chính | 6.8:1 vs dark bg |
| `--color-gold-glow` | `rgba(245, 158, 11, 0.25)` | Hiệu ứng phát quang đèn dầu, hào quang | N/A |
| `--color-crimson-red` | `#7A1C10` | Sơn son cổ truyền, hoành phi, bàn thờ | Accent |
| `--color-deep-wood` | `#2B0D06` | Gỗ lim cột chùa, sàn chánh điện | Secondary dark |
| `--color-lotus-pink` | `#F472B6` | Hoa sen cúng dường, sắc hồng thanh tịnh | 5.1:1 |
| `--color-incense-smoke`| `rgba(243, 212, 138, 0.6)` | Khói hương trầm, tàn nhang bồng bềnh | Visual effect |
| `--color-cushion-user` | `#E64A19` | Bồ đoàn vị trí của Bạn (nổi bật cam đỏ) | High contrast |
| `--color-cushion-other`| `#E3A21A` | Bồ đoàn đạo hữu đang ngồi (vàng cam) | High contrast |
| `--color-cushion-empty`| `rgba(138, 90, 42, 0.35)` | Bồ đoàn còn trống | Subdued |
| `--color-text-main` | `#FFF8EB` | Chữ chính (trắng kem ấm, không chói gắt) | 14.8:1 |
| `--color-text-muted` | `#D1BBA2` | Chữ phụ, thời gian, chú thích hướng dẫn | 7.6:1 |
| `--color-text-gold` | `#F3D48A` | Tiêu đề trang trọng, tên pháp danh | 9.4:1 |
| `--color-border-gold` | `rgba(212, 166, 64, 0.3)` | Đường viền hoạ tiết, khung ngăn cách | 3.5:1 |

---

## 2. Typography

- **Display & Headings:** `'Playfair Display', 'Merriweather', serif`  
  *Mang nét trang nghiêm, cung kính, hoài cổ của chốn thiền môn.*
- **Body & UI Elements:** `'Be Vietnam Pro', 'Plus Jakarta Sans', system-ui, sans-serif`  
  *Thiết kế chuẩn hóa cho tiếng Việt, hiển thị hoàn hảo dấu thanh điệu (huyền, sắc, hỏi, ngã, nặng).*
- **Scale:**
  - `Display / Banner`: 28px - 36px (Bold 700)
  - `H1 / Section Titles`: 20px - 24px (Semi-Bold 600)
  - `H2 / Card Titles`: 15px - 17px (Semi-Bold 600)
  - `Body Text`: 14px (Regular 400, Line-height 1.6)
  - `Caption & Badges`: 11px - 12px (Medium 500)

---

## 3. Spacing, Rhythm & Elevation

- **Base Unit:** `8px` grid system (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`).
- **Surface Elevation:**
  - `Elevation 1 (HUD Badges)`: `0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)`
  - `Elevation 2 (Drawers & Modals)`: `0 12px 32px rgba(0,0,0,0.65), 0 0 0 1px rgba(212, 166, 64, 0.25)`
  - `Elevation 3 (Golden Glow)`: `0 0 24px rgba(245, 158, 11, 0.35)`

---

## 4. Interaction & Motion System

- **Micro-interactions:**
  - Gõ mõ (Wooden Fish): Nhịp dội rung đàn hồi (Elastic scale `0.92` -> `1.08` -> `1.0`), phát chu kỳ âm thanh gỗ đanh thanh thoát.
  - Thỉnh chuông: Hiệu ứng vòng tròn sóng âm lan tỏa (Ripple wave `scale(0)` -> `scale(2.5)` + `opacity: 0`), âm chuông bát nhã ngân trầm 4.5 giây.
  - Dâng hoa / Thắp hương: Hạt khói và đài hoa bay nhẹ nhàng hướng về bàn thờ Phật.
- **Camera Physics:**
  - Quán tính mượt mà (Damping `0.88`), góc quay 360° ngang tự do, góc đứng giới hạn `[-60°, 60°]` để không bị lật hình.
  - Zoom FOV điều tiết từ `40°` (phóng to ngắm chi tiết tượng) đến `85°` (toàn cảnh chính điện).
- **Reduced Motion:** Tự động tắt hiệu ứng rung lắc và chuyển đổi sang hiệu ứng mờ nhạt nếu người dùng kích hoạt `prefers-reduced-motion`.

---

## 5. Accessibility & Cultural Reverence

- **Reverence (Tôn kính):** Ngôn từ thuần Việt trang nhã ("Đạo hữu", "Pháp danh", "Cúng dường", "Niệm Phật", "Tịnh tâm").
- **Clear Affordances:** Nút bấm tối thiểu 44x44px, hỗ trợ hoàn toàn phím tắt bàn phím (Space, B, C, M, Esc).
- **Audio Autoplay Courtesy:** Luôn khởi động với chế độ tắt tiếng và cung cấp nút bật/tắt âm thanh rõ ràng với hướng dẫn.
