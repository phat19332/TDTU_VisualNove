# 🎮 Time, Dreams, Trials & Us - Visual Novel

Chào mừng bạn đến với dự án Visual Novel về cuộc sống sinh viên tại Đại học Tôn Đức Thắng (TDTU). Dự án sử dụng Vite cho Frontend và Supabase cho hệ thống CMS/Dữ liệu kịch bản.

---

# 📝 Hướng dẫn điền kịch bản Game (Dành cho cộng tác viên)

Nếu bạn đang phụ trách viết kịch bản, hãy làm theo hướng dẫn dưới đây để điền nội dung vào bảng **`scripts`** trên Supabase Dashboard.

## 1. Giải thích các cột trong bảng (Columns)

| Tên cột | Ý nghĩa | Lưu ý |
| :--- | :--- | :--- |
| **order_index** | Thứ tự xuất hiện | Điền số: 10, 20, 30... (Phải có và không được trùng). |
| **scene_id** | Mã định danh đoạn | Ví dụ: `START`, `LOP_HOC_1`. Dùng để nhảy đến khi có Lựa chọn. |
| **bg** | Ảnh nền | Điền tên file ảnh (ví dụ: `tdtu_gate.png`). |
| **bgm** | Nhạc nền | Điền tên file nhạc (ví dụ: `tdtu_theme.mp3`) hoặc `stop` để tắt. |
| **char_name** | **Mã nhân vật (Sprite)** | Đây là mã để hiện ảnh, ví dụ: `hao_nhien`. Để `null` để ẩn. |
| **emotion** | Cảm xúc | Điền suffix cảm xúc (ví dụ: `surprised`). |
| **char_anim** | Hiệu ứng hiện hình | Ví dụ: `fade-in`, `slide-in-right`, `bounce`. |
| **speaker** | **Tên hiển thị** | Tên nhân vật hiện trong khung đỏ (ví dụ: `Hạo Nhiên`). |
| **speaker_color** | Màu khung tên | Điền mã màu (ví dụ: `#E31837` cho màu đỏ, `#0A4595` cho xanh). |
| **dialogue** | Lời thoại | **Bắt buộc**. Nội dung văn bản nhân vật nói. |
| **choices** | Các lựa chọn | Dùng định dạng JSON (Xem mục 2). |
| **next_id** | Nhảy đến dòng | Điền `scene_id` của dòng muốn tiếp nối. |

## 2. Quy tắc về Lựa chọn (Choices)

Cột `choices` phải nhập theo đúng định dạng JSON bên dưới:

```json
[
  {"text": "Đồng ý đi cùng Hạo Nhiên", "next_id": "GO_WITH_HER"},
  {"text": "Từ chối vì bận chạy deadline", "next_id": "REJECT_HER"}
]
```

## 3. Ví dụ một đoạn kịch bản mẫu

| order_index | scene_id | bg | speaker | char_name | dialogue | choices |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 10 | START | tdtu_gate.png | | | Một buổi sáng nắng đẹp tại cổng trường... | |
| 20 | INTRO | | Hạo Nhiên | hao_nhien | Chào bạn! Bạn mới chuyển đến trường mình à? | `[{"text": "Có", "next_id": "A"}, {"text": "Không", "next_id": "B"}]` |

---

# 🎵 Hướng dẫn quản lý Nhạc (BGM)

Hệ thống nhạc trong game hiện tại hoạt động theo cơ chế **Scene-Driven** (Nhạc theo cảnh):
1. **Nhạc tự động đổi** dựa trên cột `bgm` trong bảng `scripts`.
2. **Music Player (icon 🎵)** dùng để điều chỉnh âm lượng, tạm dừng và **hiển thị thông tin** bài hát đang phát.
3. **Bảng `music` trên Supabase** đóng vai trò là "Thư viện Metadata". Nếu tên file trong cột `bgm` trùng với file trong bảng `music`, trình phát sẽ hiển thị Tên bài hát + Nghệ sĩ + Ảnh bìa đẹp mắt.

### 1. Cách thiết lập Metadata cho bài hát (Bảng `music`)

| Tên cột | Ý nghĩa | Cách điền |
| :--- | :--- | :--- |
| **title** | Tên bài hát | Ví dụ: `Tự hào sinh viên Tôn Đức Thắng`. |
| **artist** | Nghệ sĩ | Ví dụ: `TDTU Chorus`. |
| **url** | **Đường dẫn file** | Copy Public URL từ Storage. **Quan trọng:** Tên file phải trùng với tên file bạn điền trong bảng `scripts`. |
| **cover_url** | Ảnh bìa | Link ảnh hiện trong Player (tùy chọn). |
| **is_active** | Kích hoạt | Tích chọn để metadata này được nạp vào game. |

### 2. Cách đổi nhạc theo từng Cảnh (Bảng `scripts`)
Trong bảng `scripts`, tại cột **`bgm`**, bạn điền tên file nhạc (ví dụ: `tdtu_theme.mp3`).
*   Khi game chạy đến dòng đó, nhạc sẽ tự đổi.
*   Music Player sẽ tự tra cứu trong bảng `music` để hiện tên "Tự hào sinh viên Tôn Đức Thắng" thay vì hiện tên file khô khan.

---

### 3. Cách lấy Link nhạc từ Supabase Storage
1. Upload file nhạc vào bucket `game-assets`.
2. Truy cập tab **Storage** -> Bucket `game-assets`.
3. Nhấn vào dấu 3 chấm cạnh file nhạc -> Chọn **Get public URL**.
4. Dán link này vào cột **`url`** trong bảng `music`.


---

## 🛠️ Công nghệ sử dụng
- **Frontend**: Vanilla JavaScript + HTML5/CSS3 + Vite
- **Backend**: Supabase (Database, Auth, Storage)
- **Deployment**: Vercel / Render

---
*(Bản hướng dẫn này được cập nhật tự động bởi Antigravity AI)*
