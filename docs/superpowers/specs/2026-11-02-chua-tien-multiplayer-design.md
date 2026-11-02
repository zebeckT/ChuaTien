# Chùa Tiên: Chính điện nhiều người (thiết kế)

Ngày: 2026-11-02 · Trạng thái: chờ duyệt

## 1. Mục đích

Hiện tại [index.html](../../../index.html) và [app.js](../../../app.js) dựng một "phòng live" chùa ảo nhưng mọi thứ đều giả lập trong trình duyệt: Phật tử viết cứng trong `DEVOTEES_CONFIG`, tin nhắn lấy từ `STREAM_EVENTS`, bộ đếm tự tăng bằng `setInterval`. Mục tiêu là biến nó thành **một chính điện thật, nhiều người cùng vào**: mỗi người là một nhân vật 3D khối vuông ngồi trên bồ đoàn, thấy được nhau và trò chuyện bằng bóng chat trên đầu. Trang được đưa lên mạng và **không sập khi đông người, tối đa 200 người cùng lúc**.

## 2. Mục tiêu, không làm, phản mục tiêu

**Mục tiêu**
- Người dùng nhập tên, chọn màu áo, rồi được xếp vào một bồ đoàn trong chính điện.
- Thấy những người thật khác đang ngồi. Tin nhắn hiện thành bóng chat trên đầu người gửi.
- Nghi thức chung: dâng hoa, gõ mõ, thả tim thỉnh chuông, vái lạy. Mọi người trong cùng gian đều thấy.
- Chịu được 200 người đồng thời. Trang tải nhanh trên điện thoại tầm trung.
- Deploy lên mạng với chi phí thấp.

**Không làm**
- Không tài khoản, không đăng nhập, **không database**. Không lưu gì qua các lần vào: thoát ra là mất.
- Không "xu", không thanh toán, không giá lễ vật, không bảng xếp hạng.
- Không đi lại tự do, không ảnh 360°, không xoay góc nhìn.
- Không có quản trị viên hay chức năng đuổi người (muốn có thì phải có đăng nhập).
- Không gọi thoại/video.

**Phản mục tiêu** (nếu xảy ra thì coi như thất bại dù code chạy):
- Trang sập hoặc đứng khi gần 200 người.
- Lời lẽ thô tục hoặc spam hiện tràn lan trên đầu nhân vật nơi tôn nghiêm.
- Người trong ảnh và người online lẫn lộn, không biết ai là ai.
- Điện thoại tầm trung giật lag hoặc nóng máy.

## 3. Ràng buộc

- Giao diện và nội dung bằng tiếng Việt, theo [design-system/chua-tien/MASTER.md](../../../design-system/chua-tien/MASTER.md): màu, font, tối thiểu 44px cho nút, tắt tiếng mặc định, `prefers-reduced-motion`.
- **Giữ nguyên ảnh tượng Phật** [assets/chua_tien_live.jpg](../../../assets/chua_tien_live.jpg) (ảnh dọc, tĩnh).
- Ưu tiên điện thoại. Trên máy tính, giữ khung kiểu điện thoại ở giữa như hiện tại (`.stream-phone-container`).
- Quy mô tối đa 200 người đồng thời.

## 4. Các hướng đã cân nhắc

| Hướng | Đánh đổi | Kết quả |
|---|---|---|
| **A. Máy chủ Node.js + Socket.IO tự chạy** (Fly.io/Render/VPS), trạng thái trong bộ nhớ | Đơn giản, rẻ, không phụ thuộc nhà cung cấp, dễ chạy thử trên máy. Phải tự triển khai và theo dõi một máy chủ. | **Đã chọn** |
| B. Cloudflare Durable Objects / PartyKit | Gần như không sập, không quản lý máy chủ. Gắn chặt Cloudflare, cách viết đặc thù, khó chạy thử trên máy. | Không chọn |
| C. Dịch vụ realtime có sẵn (Supabase Realtime, Ably) | Ít code backend. Gói miễn phí thường giới hạn khoảng 200 kết nối, dễ chạm trần. Logic chia gian, chống spam khó kiểm soát. | Không chọn |
| ~~D. Trình duyệt nối trực tiếp với nhau (WebRTC)~~ | 50 người nối chéo nhau không chạy nổi. | Loại |

Người dùng chọn **A**.

## 5. Những gì người dùng đã quyết

- Bỏ hoàn toàn "xu". Lễ vật dâng miễn phí, chỉ mang tính nghi thức.
- Không lưu dữ liệu cố định. Thoát ra hay vào lại đều là người mới.
- Nhân vật 3D kiểu khối vuông, **chủ yếu ngồi trên bồ đoàn**, tương tác bằng **bóng chat trên đầu**.
- Tối đa **200 người**.
- Bố cục **B, "phòng live"**: có thẻ đếm chung và một dòng sự kiện nhỏ.
- **Giữ ảnh tượng Phật cũ.** Giữ nửa trên của ảnh (tượng, hào quang, bàn thờ, hoành phi). **Sàn được làm trống**: chỉ người online mới ngồi đó, không còn người trong ảnh.
- Màn hình vào chùa: **nhập tên + chọn màu** nhân vật.
- Chống quấy rối: giới hạn tần suất, lọc từ thô tục, và nút ẩn tin nhắn của một người.

## 6. Thiết kế

### 6.1 Kiến trúc

```
Trình duyệt ──HTTPS──▶ Cloudflare Pages (CDN): index.html, JS, CSS, ảnh, three.js
     │
     └──WebSocket (Socket.IO)──▶ Máy chủ Node.js (Fly.io, 1 máy nhỏ)
                                  └─ 4 gian × 50 bồ đoàn, toàn bộ trong RAM
```

- **File tĩnh qua CDN.** Đây là thứ nặng nhất (ảnh, thư viện 3D) và là điểm dễ nghẽn nhất lúc đông người. CDN gánh việc này miễn phí, máy chủ Node chỉ lo WebSocket.
- **Một tiến trình Node** giữ toàn bộ trạng thái. 200 kết nối với tin nhắn thưa là tải rất nhẹ (máy 256–512MB là đủ). Khởi động lại thì mọi người tự kết nối lại và vào lại từ đầu, các bộ đếm về 0. Điều này chấp nhận được vì không có lưu trữ.
- *Lựa chọn của Claude:* Cloudflare Pages + Fly.io (khoảng 2–5 USD/tháng, có thẻ thanh toán). Render là phương án thay thế, nhưng gói miễn phí của Render "ngủ" khi không có người nên không phù hợp.

### 6.2 Gian và bồ đoàn

- 4 gian (`hall-1` … `hall-4`), mỗi gian 50 bồ đoàn đánh số 1–50. Tổng trần 200 người.
- **Xếp gian:** lấy gian *có số nhỏ nhất còn chỗ*, tức là lấp đầy gian 1 trước, để người dùng thấy nhau nhiều nhất thay vì bị rải mỏng.
- **Xếp chỗ:** lấy bồ đoàn trống *gần tượng Phật nhất* (thứ tự 1→50 đã sắp sẵn theo khoảng cách).
- **Đầy cả 4 gian:** từ chối kèm thông báo "Chính điện đã đủ chỗ, xin vui lòng quay lại sau ít phút". Màn hình vào chùa có nút thử lại.
- **Rời đi:** đóng tab, hoặc mất kết nối quá **30 giây** thì nhân vật rời đi và chỗ được giải phóng. Trong 30 giây đó chỗ vẫn được giữ, kết nối lại sẽ về đúng chỗ cũ. Việc này dùng một `sessionId` ngẫu nhiên lưu trong `sessionStorage`, nên chỉ sống trong tab đó và không phải danh tính lâu dài.

### 6.3 Giao thức (sự kiện Socket.IO)

Client → server:
- `join {name, color, sessionId?}`
- `chat {text}`
- `action {type: "bow" | "gomo" | "flower" | "heart"}`

Server → client:
- `joined {hallId, seat, you, occupants: [{seat, name, color}], counters: {flowers, bells}}`
- `full {}`
- `occupant:join {seat, name, color}`, `occupant:leave {seat}`
- `chat {seat, text}`
- `action {seat, type}`
- `counters {flowers, bells}`: gửi gộp, tối đa 2 lần/giây mỗi gian, không gửi theo từng lần bấm.
- `error {code, message}`, ví dụ `rate_limited`, `invalid_name`

Mọi tin chỉ phát trong phạm vi gian của người gửi (Socket.IO room).

### 6.4 Kiểm tra đầu vào và chống quấy rối (phía máy chủ)

- **Tên:** cắt khoảng trắng hai đầu, bỏ ký tự điều khiển, dài 1–20 ký tự, lọc từ thô tục (vi phạm thì từ chối và yêu cầu nhập tên khác). Tên trùng được phép.
- **Màu:** chỉ chấp nhận một trong 8 màu cố định của bảng màu. Giá trị lạ thì dùng màu mặc định.
- **Tin nhắn:** tối đa 100 ký tự, **tối đa 1 tin / 3 giây** mỗi người. Từ thô tục bị thay bằng `***`. Gửi quá nhanh thì báo `rate_limited` và không phát tin.
- **Hành động:** tim tối đa khoảng 10 lần/giây mỗi người, phần vượt bị bỏ qua. Các hành động khác tối đa 1 lần/giây.
- **Ẩn tin nhắn:** chạm vào nhân vật, chọn "Ẩn tin nhắn người này". Chức năng này chỉ chạy trên máy người bấm, theo số ghế trong phiên đó. Máy chủ không cần biết.
- Danh sách từ thô tục tiếng Việt nằm trong một file dữ liệu riêng để dễ bổ sung. So khớp không phân biệt hoa thường và có xử lý bỏ dấu (ví dụ "dm", "đm").

### 6.5 Giao diện

**Màn hình vào chùa**
- Nền là ảnh tượng Phật làm mờ, tiêu đề "Chùa Tiên", ô nhập tên, một hàng 8 ô màu, và xem trước nhân vật khối vuông đổi màu theo lựa chọn.
- Nút "Vào chùa 🙏". Cú chạm này cũng là lúc khởi động âm thanh (vẫn tắt tiếng mặc định).

**Màn hình chính điện** (bố cục B)
- **Nền:** nửa trên giữ nguyên ảnh. Nửa dưới là **sàn 3D đặc** (Three.js, mở rộng từ sàn và thảm đỏ đã có trong `initThreeScene`) **che hoàn toàn các Phật tử trong ảnh**. Ranh giới giữa ảnh và sàn phải liền mạch (dải gradient hoặc mép bậc thềm bàn thờ). Góc nhìn cố định như camera hiện tại.
- **Nhân vật:** khối vuông, low-poly (đầu, thân, tay chắp, ngồi kiết già), áo theo màu đã chọn. **Thay** `create3DDevotee` hiện tại. Bồ đoàn của mình màu `--color-cushion-user`, của người khác `--color-cushion-other`. Bồ đoàn trống *không hiển thị*, hoặc hiện rất mờ (`--color-cushion-empty`).
- **50 vị trí:** hai bên thảm đỏ, nhiều hàng lùi dần về phía tượng Phật (hàng xa nhỏ hơn theo phối cảnh). Tọa độ là một mảng cố định dùng chung cho client và server.
- **Tên:** chỉ hiện khi người đó đang nói, khi được chạm vào, và luôn hiện với chính mình. Mục đích là tránh 50 nhãn tên làm rối màn hình.
- **Bóng chat:** hiện trên đầu khoảng 5 giây rồi mờ dần. Tin mới thay tin cũ của cùng người.
- **Hành động thấy được:** vái lạy (nhân vật cúi người, tái dùng `bowDevotee`), gõ mõ (âm thanh + gợn sóng), dâng hoa (hạt hoa bay về bàn thờ, tái dùng `triggerOfferingEffect`), tim (tim bay lên từ nhân vật đó).
- **Phần hiển thị trên màn hình:** góc trên trái là "🏯 Chính điện 2 · 37/50". Góc trên phải là nút âm thanh và menu (rời chùa). Có hai thẻ nhỏ: "🕯️ Hoa đã dâng" và "🔔 Thỉnh chuông", đếm trong buổi theo gian. Dòng sự kiện ở góc dưới trái hiện tối đa 3 dòng, tự mờ (ai vào chùa, ai rời, ai dâng hoa). Thanh dưới cùng có ô nhập tin, các nút dâng hoa, gõ mõ, vái lạy, và tim.
- **Bỏ:** "xu" và giá lễ vật, bảng xếp hạng, đồng hồ đếm ngược, `STREAM_EVENTS`, `DEVOTEES_CONFIG`, toast chia sẻ giả, và các thẻ tên đặt cứng `.seat-badge-tag`. Hộp lễ vật (modal) được rút gọn thành các nút dâng miễn phí.
- **Mất kết nối:** hiện lớp phủ "Đang kết nối lại…". Quá 30 giây thì quay về màn hình vào chùa.

### 6.6 Hiệu năng (chống sập và chống lag)

- **Ảnh:** nén sang WebP, giữ JPG làm dự phòng. Mục tiêu dưới 250KB (hiện là 1.08MB). Đặt kích thước theo màn hình điện thoại.
- **Three.js:** tự host trên CDN cùng trang hoặc dùng cdnjs, giới hạn `pixelRatio` ≤ 2. **Tắt đổ bóng trên điện thoại.** Nhân vật dùng chung geometry và material theo màu, để 50 nhân vật không tạo 50 bộ geometry.
- **Máy chủ:** gộp cập nhật bộ đếm (tối đa 2 lần/giây). Không phát lại toàn bộ danh sách người mỗi lần có thay đổi. Có `GET /health`. Fly tự khởi động lại khi tiến trình chết.
- **Kiểm tra tải:** một script giả lập 200 client Socket.IO (vào chùa, chat 1 tin mỗi 5–10 giây, thả tim). Đạt khi máy chủ không lỗi, độ trễ phát tin dưới 300ms, RAM dưới 200MB.

### 6.7 Kiểm thử

- **Unit test** (máy chủ): xếp gian/xếp chỗ (lấp gian 1 trước, đầy thì từ chối), giữ chỗ 30 giây khi kết nối lại, kiểm tra tên/màu/tin nhắn, giới hạn tần suất, lọc từ thô tục.
- **Integration test:** hai client thật kết nối, thấy nhau vào/ra, nhận được chat và hành động của nhau.
- **Kiểm tra tải:** như mục 6.6.
- **Thủ công:** mở 2–3 tab, kiểm tra trên một điện thoại thật.

### 6.8 Triển khai

- Thư mục đề xuất: `client/` (trang tĩnh), `server/` (Node + Socket.IO), `shared/` (tọa độ 50 ghế, bảng màu, giới hạn).
- Client đọc địa chỉ máy chủ WebSocket từ cấu hình lúc build hoặc từ một biến trong `index.html`. Máy chủ chỉ chấp nhận kết nối từ domain của trang (CORS / kiểm tra origin).
- Viết `docs/deploy.md` hướng dẫn từng bước: tạo tài khoản Cloudflare Pages và Fly.io, `fly launch`, `fly deploy`, gắn domain riêng (nếu có).
- Khởi tạo git cho dự án (hiện chưa có) và thêm `.superpowers/` vào `.gitignore`.

## 7. Để người xây dựng tự quyết

- 8 màu áo cụ thể. Nên lấy từ design system và đảm bảo dễ phân biệt trên nền tối.
- Hình dạng chi tiết của nhân vật khối vuông, trong giới hạn low-poly và "chắp tay ngồi thiền".
- Tọa độ chính xác của 50 bồ đoàn sao cho khớp phối cảnh của ảnh.
- Có nâng Three.js từ r128 lên bản mới hơn hay không.
- Nguồn và nội dung ban đầu của danh sách từ thô tục.
- Có dùng công cụ build (Vite) cho client hay giữ HTML/JS thuần.
