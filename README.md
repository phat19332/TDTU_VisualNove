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
  - **Music Listening**: Thử thách khả năng nghe tiếng Anh qua bài hát (Cloze Test) với hệ thống đồng bộ lời bài hát thời gian thực. Bảng xếp hạng điểm số (Leaderboard) toàn cầu.
- 🔒 **Bảo mật Supabase (Anonymous Auth)**: Hệ thống cơ sở dữ liệu được bảo vệ nghiêm ngặt bằng Row Level Security (RLS) với định danh ẩn danh (Anonymous Sign-in), ngăn chặn hacker sửa đổi file Save hay phá hoại bảng xếp hạng.

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
├── listening.js      # Logic cho Music Listening Minigame
├── listeningData.js  # Dữ liệu bài hát, lyrics và timestamps cho Listening
├── listening.css     # Giao diện riêng cho module Listening
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
5. Chạy `listening_leaderboard_setup.sql` (Khởi tạo Bảng xếp hạng Listening).
6. Chạy `supabase_auth_patch.sql` và `supabase_security_patch.sql` (Vá lỗi bảo mật, kích hoạt Anonymous Sign-in và Row Level Security).

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

### ⚙️ Thông số cảnh, Thoại & Hành động (Actions)
| Tên cột | Ý nghĩa | Lưu ý |
| :--- | :--- | :--- |
| **order_index** | Thứ tự xuất hiện | Điền số: 10, 20, 30... (Bắt buộc và không trùng). |
| **scene_id** | Mã định danh đoạn | Ví dụ: `START`, `LOP_HOC_1`. Dùng để nhảy đến khi có Lựa chọn. |
| **action** | Gọi sự kiện/Game | Điền lệnh (VD: `start_exam_part1`, `start_exam_part2`). Bỏ trống nếu là thoại bình thường. |
| **bg** | Ảnh nền | Điền tên file ảnh trong Storage (ví dụ: `tdtu_gate.png`). |
| **bgm** | Nhạc nền | Điền tên file nhạc (ví dụ: `tdtu_theme.mp3`) hoặc `stop` để tắt. |
| **char_anim** | Hiệu ứng hiện hình | Ví dụ: `fade-in` (mặc định), `slide-in-right`. |
| **dialogue** | Lời thoại | Text thường hoặc JSON `{"vi": "Tiếng Việt", "en": "English"}`. Nếu dùng `action`, có thể gõ đại 1 dấu chấm `.` vào đây. |
| **choices** | Các lựa chọn | Dùng định dạng JSON hoặc Viết tắt (Shorthand). |
| **next_id** | Nhảy đến dòng | Điền `scene_id` của dòng tiếp theo. |
| **sfx** | Hiệu ứng âm thanh | Tên file SFX (VD: `thunder.mp3`). Điền `stop` để dừng SFX đang phát. |

> [!TIP]
> **Lệnh `action` cho Kỳ Thi Tiếng Anh**: 
> - Dùng `start_exam_part1`: Để gọi phần thi **Rhythm Game**. Điểm được lưu ngầm.
> - Dùng `start_exam_part2`: Để gọi phần thi **Listening** và **Wordle**, sau đó tự động tổng hợp điểm cả 3 phần để trả về xếp loại `{english_class}`.

## 2. Hệ thống Nâng cao cho Kịch bản

### Đặt tên & Biến số (`{Name}`)
Trong thoại, sử dụng **`{Name}`**.
*   VD: `Hạo Nhiên: Chào {Name}! Đi thư viện không?`
*   Engine sẽ tự thay thế bằng tên MC người chơi nhập vào.
Tương tự, biến **`{english_class}`** sẽ hiển thị lớp xếp loại tiếng anh của người chơi sau khi thi xong.

### Tự động lưu (Auto-save)
Game sẽ tự động lưu lại tiến trình vào **Slot 0** sau mỗi 30 giây hoặc khi có thay đổi quan trọng. Người chơi có thể tải lại từ Slot 0 này bất cứ lúc nào từ Menu Load. Lưu ý: Do cơ chế bảo mật mới, file save được đồng bộ với tài khoản ẩn danh trên trình duyệt hiện tại.

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
