# 🎮 Time, Dreams, Trials & Us - Visual Novel

Chào mừng bạn đến với **Time, Dreams, Trials & Us**, một dự án Visual Novel lấy cảm hứng từ cuộc sống sinh viên tại Đại học Tôn Đức Thắng (TDTU). Trò chơi mang đến một trải nghiệm tương tác với cốt truyện hấp dẫn, cùng với các mini-games thú vị.

## ✨ Tính năng nổi bật (Features)

- 📖 **Hệ thống Visual Novel Toàn Diện**: Hội thoại, lựa chọn rẽ nhánh cốt truyện, quản lý hiển thị nhân vật và cảm xúc động.
- 🌍 **Đa Ngôn Ngữ (i18n)**: Hỗ trợ tiếng Việt và Tiếng Anh (bao gồm cả UI và Live Translation cho kịch bản).
- 🎵 **Trình Phát Nhạc Nâng Cao (Music Player)**: Hệ thống nhạc nền tự động chuyển cảnh, khóa nhạc (fixed mood) và chế độ playlist.
- 💾 **Lưu Trữ Tiến Trình**: Hỗ trợ Auto-save (Lưu tự động sau mỗi 30s) và các Slot Save/Load để lưu giữ các khoảnh khắc quan trọng. Cấu hình tự do tên nhân vật chính.
- 🖼️ **Thư Viện Ảnh (Gallery)**: Mở khóa các hình ảnh (CGs) quan trọng khi trải qua các phân đoạn cốt truyện.
- 🎮 **Mini-games Tích Hợp**: 
  - **Wordle Challenge**: Giải đố tiếng Anh phong cách Wordle.
  - **Rhythm Game**: Game âm nhạc nhịp điệu phong cách FNF với 4 độ khó, thanh máu Tug-of-war.

## 🛠️ Công nghệ sử dụng (Tech Stack)

- **Frontend**: HTML5, Vanilla JavaScript (ES6 Modules), CSS3.
- **Build Tool**: [Vite](https://vitejs.dev/) (Tối ưu hóa và chạy Local Server tốc độ cao).
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL cho CMS Kịch bản, Music Metadata, và Lưu trữ đám mây).

## 📂 Cấu trúc dự án (Project Structure)

```text
📁 TDTU_VisualNovel
├── index.html        # Giao diện chính của game
├── style.css         # CSS chính cho UI và Visual Novel engine
├── wordle.css        # CSS cho mini-game Wordle
├── main.js           # Entry point khởi tạo Game
├── engine.js         # Core Engine (Text rendering, Choices, Save/Load)
├── rhythm.js         # Logic cho Rhythm Minigame
├── wordle.js         # Logic cho Wordle Minigame
├── i18n.js           # Trình quản lý Đa ngôn ngữ (Vietnamese/English)
├── supabase.js       # Kết nối và thao tác với Supabase
├── gameData.js       # Quản lý Data, States, biến số toàn cục
└── package.json      # Vite configuration & scripts
```

---

## 🚀 Cài đặt & Phát triển (Dành cho Developer)

### 1. Yêu cầu hệ thống
- [Node.js](https://nodejs.org/) (Khuyên dùng v18+)
- Tài khoản [Supabase](https://supabase.com/) (Dùng cho Database và Storage)

### 2. Thiết lập dự án

```bash
# Clone dự án (nếu bạn dùng git)
# git clone <url>
# cd TDTU_VisualNovel

# Cài đặt các thư viện (Vite, Supabase JS Client)
npm install
```

### 3. Cấu hình Supabase
- Mở file `supabase.js`.
- Cập nhật thông tin `SUPABASE_URL` và `ANON_KEY` bằng API Keys từ dự án Supabase của bạn.

### 4. Khởi tạo Database (Supabase SQL)
Chạy lần lượt các script SQL trong thư mục dự án lên Supabase SQL Editor:
1. Chạy `supabase_setup.sql` (Khởi tạo các bảng cơ bản).
2. Chạy `scripts_update.sql` (Cập nhật hệ thống Dual characters).
3. Chạy `advanced_systems_setup.sql` (Nếu có - Cấu hình Naming, Gallery, Auto-save).
4. Chạy `sfx_setup.sql` (Thêm cột Sound Effect cho kịch bản).

### 5. Chạy Server Local
```bash
npm run dev
```
Mở trình duyệt tại địa chỉ được cung cấp (thường là `http://localhost:5173/`).

---

# 📝 Hướng dẫn kịch bản & Content (Dành cho Cộng tác viên)

Nếu bạn đang phụ trách viết kịch bản, hãy làm theo hướng dẫn dưới đây để điền nội dung vào bảng **`scripts`** trên Supabase Dashboard.

## 1. Cấu trúc bảng Kịch bản (`scripts`)

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
> **Hiệu ứng Visual Focus**: Engine tự động so khớp tên trong cột `speaker` với nhân vật. Nhân vật đang nói sẽ **sáng hơn và phóng to**, nhân vật nghe sẽ **tối lại và lùi về sau**.

### ⚙️ Thông số cảnh & Thoại
| Tên cột | Ý nghĩa | Lưu ý |
| :--- | :--- | :--- |
| **order_index** | Thứ tự xuất hiện | Điền số: 10, 20, 30... (Bắt buộc và không trùng). |
| **scene_id** | Mã định danh đoạn | Ví dụ: `START`, `LOP_HOC_1`. Dùng để nhảy đến khi có Lựa chọn. |
| **bg** | Ảnh nền | Điền tên file ảnh trong Storage (ví dụ: `tdtu_gate.png`). |
| **bgm** | Nhạc nền | Điền tên file nhạc (ví dụ: `tdtu_theme.mp3`) hoặc `stop` để tắt. |
| **char_anim** | Hiệu ứng hiện hình | Ví dụ: `fade-in` (mặc định), `slide-in-right`. |
| **dialogue** | Lời thoại | **Bắt buộc**. Text thường hoặc JSON `{"vi": "Tiếng Việt", "en": "English"}`. |
| **choices** | Các lựa chọn | Dùng định dạng JSON hoặc Viết tắt (Shorthand). |
| **next_id** | Nhảy đến dòng | Điền `scene_id` của dòng tiếp theo. |
| **sfx** | Hiệu ứng âm thanh | Tên file SFX (VD: `thunder.mp3`). BGM sẽ tự giảm nhỏ khi SFX phát. |
| **sfx_volume** | Âm lượng SFX | Từ 0.0 đến 1.0 (mặc định: 1.0). |

---

## 2. Hệ thống Nâng cao cho Kịch bản

### Đặt tên & Biến số (`{Name}`)
Trong thoại, sử dụng **`{Name}`**.
*   VD: `Hạo Nhiên: Chào {Name}! Đi thư viện không?`
*   Engine sẽ tự thay thế bằng tên MC người chơi nhập vào.

### Tự động lưu (Auto-save)
Game sẽ tự động lưu lại tiến trình vào **Slot 0** sau mỗi 30 giây hoặc khi có thay đổi quan trọng. Người chơi có thể tải lại từ Slot 0 này bất cứ lúc nào từ Menu Load.

### Thư viện Ảnh (Gallery)
Thêm cột **`cg_id`** vào bảng `scripts`. Khi người chơi đọc đến dòng đó, ảnh `bg` sẽ được mở khóa vĩnh viễn trong Gallery. *(Danh sách ID ảnh được cấu hình trong `main.js` (biến `CG_GALLERY`))*.

### Quy tắc Lựa chọn (Choices)

Cột `choices` hỗ trợ 2 định dạng:

**Cách 1: Viết tắt (Shorthand) - Khuyên dùng cho người mới**
Ngăn cách các lựa chọn bằng `;;` và ngăn cách Lời thoại | ID Scene kế bằng `|`:
`Đồng ý đi cùng|GO_WITH_HER ;; Từ chối|REJECT_HER`

**Cách 2: Dữ liệu JSON - Dùng khi có ký tự đặc biệt**
```json
[
  {"text": "Đồng ý đi cùng Hạo Nhiên", "next_id": "GO_WITH_HER"},
  {"text": "Từ chối vì bận chạy deadline", "next_id": "REJECT_HER"}
]
```

---

## 3. Hệ thống Đa ngôn ngữ (i18n)

Game hiện tại hỗ trợ chuyển giao diện tĩnh và kịch bản cốt truyện tự động (Live Translation) giữa Tiếng Việt và Tiếng Anh:

1. **Giao diện (UI)**: Quản lý trong `i18n.js`. Không cần chỉnh sửa qua Supabase.
2. **Kịch bản (Scripts)**: Nhập dạng JSON ngay vào cột `dialogue` trên Supabase:
   ```json
   {"vi": "Xin chào!", "en": "Hello!"}
   ```
*(Ngôn ngữ mặc định được tự động thiết lập và lưu trên trình duyệt của người chơi)*

---

## 4. Quản lý Nhạc & BGM

Hệ thống nhạc hoạt động theo cơ chế **Scene-Driven**:
1. Nhạc đổi theo cột `bgm` của `scripts`.
2. **Bảng `music` (Metadata)**: Nếu tên file `bgm` khớp với bảng `music`, Player sẽ hiển thị Tên bài hát, Nghệ sĩ và Ảnh bìa.

### Thiết lập Bảng `music`
| Tên cột | Ý nghĩa | Cách điền |
| :--- | :--- | :--- |
| **title** | Tên bài hát | Ví dụ: `Tự hào sinh viên Tôn Đức Thắng`. |
| **artist** | Nghệ sĩ | Ví dụ: `TDTU Chorus`. |
| **url** | **Link nhạc** | Copy Public URL từ Storage (Phải khớp với `bgm` trong scripts). |
| **cover_url** | Ảnh bìa | Link ảnh hiện trong Player (tuỳ chọn). |

### Khóa Nhạc (Fixed Mood)
Dùng cột **`bgm_lock` = `true`** trong `scripts`. Trình phát nhạc sẽ hiện 🔒 và chặn người chơi đổi nhạc, giữ nguyên cảm xúc cho cảnh quan trọng. Chế độ Playlist cũng có thể được bật từ Player.

---
*(Bản hướng dẫn này được cập nhật đầy đủ bởi FEG)*

