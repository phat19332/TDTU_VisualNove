# 🎮 Time, Dreams, Trials & Us - Visual Novel

Chào mừng bạn đến với dự án Visual Novel về cuộc sống sinh viên tại Đại học Tôn Đức Thắng (TDTU). Dự án sử dụng Vite cho Frontend và Supabase cho hệ thống CMS/Dữ liệu kịch bản.

---

# 📝 Hướng dẫn điền kịch bản Game (Dành cho cộng tác viên)

Nếu bạn đang phụ trách viết kịch bản, hãy làm theo hướng dẫn dưới đây để điền nội dung vào bảng **`scripts`** trên Supabase Dashboard.

## 1. Giải thích các cột trong bảng (Columns)

### 🎭 Hệ thống Nhân vật (Stage System)
Game hỗ trợ hiển thị **2 nhân vật cùng lúc** (Trái và Phải). 

| Tên cột | Ý nghĩa | Lưu ý |
| :--- | :--- | :--- |
| **char_l** | Nhân vật bên Trái | Điền mã nhân vật (VD: `hao_nhien`). Để `null` để ẩn. |
| **char_r** | Nhân vật bên Phải | Điền mã nhân vật (VD: `chi_lan`). Để `null` để ẩn. |
| **emotion_l** | Cảm xúc nhân vật trái | Điền suffix (VD: `surprised`, `happy`). |
| **emotion_r** | Cảm xúc nhân vật phải | Như trên. |
| **speaker** | **Tên hiển thị** | Tên nhân vật hiện trong khung tên (VD: `Hạo Nhiên`). |

> [!IMPORTANT]
> **Hiệu ứng Visual Focus**: Engine sẽ tự động so khớp tên trong cột `speaker` với nhân vật ở các Slot. 
> - Nhân vật đang nói sẽ **sáng hơn** và hơi phóng to.
> - Nhân vật đang nghe sẽ **tối lại** và lùi về phía sau.

### ⚙️ Thông số khác
| Tên cột | Ý nghĩa | Lưu ý |
| :--- | :--- | :--- |
| **order_index** | Thứ tự xuất hiện | Điền số: 10, 20, 30... (Bắt buộc và không trùng). |
| **scene_id** | Mã định danh đoạn | Ví dụ: `START`, `LOP_HOC_1`. Dùng để nhảy đến khi có Lựa chọn. |
| **bg** | Ảnh nền | Điền tên file ảnh trong Storage (ví dụ: `tdtu_gate.png`). |
| **bgm** | Nhạc nền | Điền tên file nhạc (ví dụ: `tdtu_theme.mp3`) hoặc `stop` để tắt. |
| **char_anim** | Hiệu ứng hiện hình | Ví dụ: `fade-in` (mặc định), `slide-in-right`. |
| **dialogue** | Lời thoại | **Bắt buộc**. Nhập text thông thường hoặc mã JSON `{"vi": "Tiếng Việt", "en": "English"}` để hỗ trợ 2 ngôn ngữ. |
| **choices** | Các lựa chọn | Dùng định dạng JSON hoặc viết tắt (Shorthand) (Xem mục 2). |
| **next_id** | Nhảy đến dòng | Điền `scene_id` của dòng muốn tiếp nối. |

### 2. Hệ thống Đặt tên & Biến số
Bạn có thể cho người chơi tự đặt tên nhân vật chính. Trong bảng kịch bản, hãy sử dụng từ khóa **`{Name}`**.
*   Ví dụ: `Hạo Nhiên: Chào {Name}! Bạn có muốn đi tham quan thư viện không?`
*   Engine sẽ tự động thay thế `{Name}` bằng tên mà người chơi đã nhập lúc bắt đầu game.

### 3. Tự động lưu (Auto-save)
Game sẽ tự động lưu lại tiến trình vào **Slot 0** sau mỗi 30 giây hoặc khi có thay đổi quan trọng. Người chơi có thể tải lại từ Slot 0 này bất cứ lúc nào từ Menu Load.

### 4. Thư viện Ảnh (Gallery)
Để mở khóa ảnh trong Gallery, bạn cần thêm cột **`cg_id`** vào bảng `scripts`.
*   Khi người chơi xem đến dòng có `cg_id` tương ứng, ảnh tại cột `bg` dòng đó sẽ được mở khóa vĩnh viễn trong Gallery.
*   Danh sách ID ảnh được cấu hình trong `main.js` (biến `CG_GALLERY`).

### 5. Chế độ Playlist (Music)
Trong trình phát nhạc, nhấn vào biểu tượng 🔁 để bật chế độ Playlist.
*   **Tắt (Mặc định)**: Lặp lại liên tục bài nhạc hiện tại của cảnh đó.
*   **Bật**: Khi bài nhạc kết thúc, hệ thống sẽ tự động chuyển sang bài tiếp theo trong Thư viện BGM.

---

## 2. Quy tắc về Lựa chọn (Choices)

Cột `choices` hỗ trợ 2 định dạng:

**Cách 1: Viết tắt (Shorthand) - Khuyên dùng cho người mới**
Ngăn cách các lựa chọn bằng `;;` và ngăn cách Lời thoại | ID Scene kế bằng `|`, ví dụ:
`Đồng ý đi cùng|GO_WITH_HER ;; Từ chối|REJECT_HER`

**Cách 2: Định dạng dữ liệu (JSON) - Dùng khi có ký tự đặc biệt**
```json
[
  {"text": "Đồng ý đi cùng Hạo Nhiên", "next_id": "GO_WITH_HER"},
  {"text": "Từ chối vì bận chạy deadline", "next_id": "REJECT_HER"}
]
```

---

# 🌐 Hệ thống Đa ngôn ngữ (i18n)

Game hiện tại hỗ trợ chuyển giao diện tĩnh và kịch bản cốt truyện tự động (Live Translation) giữa Tiếng Việt và Tiếng Anh:

1. **Giao diện (UI)**: Nội dung như Settings, Menu, Navigation, Gallery... được quản lý ở file `i18n.js`. Không cần chỉnh sửa qua Supabase.
2. **Kịch bản (Scripts)**: Để cốt truyện có 2 ngôn ngữ, hãy nhập ở dạng JSONB cục bộ ngay vào cột `dialogue`. Engine sẽ tự động trích xuất theo ngôn ngữ người dùng đang chọn:
   ```json
   {"vi": "Xin chào!", "en": "Hello!"}
   ```
   *(Ngôn ngữ mặc định được tự động thiết lập và lưu trên trình duyệt của người chơi)*

---

# 🎵 Hướng dẫn quản lý Nhạc (BGM)

Hệ thống nhạc trong game hiện tại hoạt động theo cơ chế **Scene-Driven** (Nhạc theo cảnh):
1. **Nhạc tự động đổi** dựa trên cột `bgm` trong bảng `scripts`. 
2. **Bảng `music` trên Supabase** đóng vai trò là "Thư viện Metadata". Nếu tên file trong cột `bgm` (scripts) trùng với file trong bảng `music`, trình phát sẽ hiển thị Tên bài hát + Nghệ sĩ + Ảnh bìa.

### 1. Cách thiết lập Metadata (Bảng `music`)
| Tên cột | Ý nghĩa | Cách điền |
| :--- | :--- | :--- |
| **title** | Tên bài hát | Ví dụ: `Tự hào sinh viên Tôn Đức Thắng`. |
| **artist** | Nghệ sĩ | Ví dụ: `TDTU Chorus`. |
| **url** | **Link nhạc** | Copy Public URL từ Storage. **Quan trọng:** Tên file phải khớp với bảng `scripts`. |
| **cover_url** | Ảnh bìa | Link ảnh hiện trong Player (tùy chọn). |

### 2. Cách Khóa Nhạc theo Cảnh (Fixed Mood)
Để tránh người chơi tự ý đổi nhạc trong những phân đoạn quan trọng (cần giữ mood), bạn có thể dùng cột **`bgm_lock`** trong bảng `scripts`:

*   **`bgm_lock` = `true`**: Trình phát nhạc sẽ hiển thị icon 🔒, danh sách bài hát mờ đi và người chơi **không thể click chọn bài khác**.
*   Các chức năng như Tạm dừng (Pause) và Âm lượng (Volume) vẫn hoạt động bình thường.

---

## 🛠️ Cài đặt & Phát triển (Dành cho Developer)

1. **Cấu hình Supabase**: Cập nhật thông tin `SUPABASE_URL` và `ANON_KEY` trong file `supabase.js`.
2. **Cập nhật Database**: 
   - Chạy `supabase_setup.sql` (Khởi tạo).
   - Chạy `scripts_update.sql` (Dual characters).
   - Chạy `advanced_systems_setup.sql` (Naming, Gallery, Auto-save).
3. **Chạy Local**:
   ```bash
   npm install
   npm run dev
   ```

---
*(Bản hướng dẫn này được cập nhật đầy đủ bởi Tanzel)*
