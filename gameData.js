export const storyScript = [
  {
    id: "start",
    bg: "/assets/backgrounds/tdtu_gate.png",
    bgm: "/assets/audio/tdtu_theme.mp3", // Đường dẫn nhạc nền
    char: null,
    speaker: "",
    text: "Mùa thu mát mẻ, bầu trời trong xanh lạ thường."
  },
  {
    bg: "/assets/backgrounds/tdtu_gate.png",
    char: null,
    speaker: "",
    text: "Hôm nay là ngày đầu tiên tôi bước chân vào đại học..."
  },
  {
    char: "hao_nhien", 
    emotion: "surprised", // Sẽ load ảnh hao_nhien_surprised.png
    charAnim: "slide-in-right",
    speaker: "Hạo Nhiên",
    speakerColor: "var(--tdt-blue)",
    text: "Woah! Trường TDTU bự chà bá lửa luôn! Thế này có mà đi lạc mất..."
  },
  {
    speaker: "Hạo Nhiên",
    text: "Mình nhớ là phòng học khoa IT nằm ở dãy C thì phải. Phải đi nhanh mới được, lỡ điểm danh muộn là tiêu!"
  },
  {
    speaker: "Hạo Nhiên",
    text: "À khoan...",
    choices: [
      { text: "Chạy một mạch kiếm toà nhà C", next: "run_c" },
      { text: "Hỏi đường các anh chị tình nguyện viên", next: "ask" }
    ]
  },
  {
    id: "run_c",
    speaker: "Hạo Nhiên",
    text: "Mình khỏe mà, cứ chạy loăng quăng một hồi chắc chắn sẽ thấy."
  },
  {
    speaker: "",
    char: null,
    text: "Thế là Hạo Nhiên cắm đầu chạy như bay qua các tòa nhà... và kết quả là đi lạc sang tận bãi giữ xe."
  },
  {
    speaker: "Hạo Nhiên",
    char: "hao_nhien",
    text: "Đau đầu quá, không ngờ nó rộng thế này thật. Thôi thì đành hỏi đường vậy...",
    next: "ask_merged"
  },
  {
    id: "ask",
    speaker: "Hạo Nhiên",
    text: "Hỏi đường cho chắc ăn, người Việt Nam mà, miệng là đường."
  },
  {
    id: "ask_merged",
    speaker: "Ngẫu nhiên",
    speakerColor: "var(--tdt-red)",
    char: null,
    text: "Tòa C em cứ đi thẳng tới tòa A quẹo trái là thấy nha."
  },
  {
    speaker: "Hạo Nhiên",
    char: "/assets/characters/hao_nhien.png",
    text: "Dạ em cảm ơn! Ôi thư viện có vẻ ngầu ghê... chờ chút, sắp trễ giờ rồi!"
  },
  {
    speaker: "",
    char: null,
    text: "Hành trình tại TDTU của Hạo Nhiên vừa mới thực sự bắt đầu...",
    next: "english_exam_intro"
  },

  // ════════════════════════════════════════════════
  // CHƯƠNG 2: KỲ THI XẾP LỚP TIẾNG ANH
  // ════════════════════════════════════════════════
  {
    id: "english_exam_intro",
    bg: "/assets/backgrounds/tdtu_gate.png",
    bgm: "/assets/audio/tdtu_theme.mp3",
    char: null,
    speaker: "",
    text: "Một tuần sau khi nhập học..."
  },
  {
    speaker: "",
    char: null,
    text: "Hạo Nhiên nhận được thông báo quan trọng từ khoa: sinh viên năm nhất phải tham gia kỳ thi xếp lớp Tiếng Anh."
  },
  {
    char: "hao_nhien",
    emotion: "surprised",
    speaker: "Hạo Nhiên",
    speakerColor: "var(--tdt-blue)",
    text: "Thi xếp lớp?! Mà thi gì kỳ vậy... Wordle, nghe nhạc, với cả nhịp điệu?! Trường này thật sự khác người luôn!"
  },
  {
    speaker: "Hạo Nhiên",
    text: "Thôi kệ, mình cứ thử sức xem sao. Kết quả sẽ quyết định mình học lớp Tiếng Anh nào trong suốt năm học này đấy!"
  },
  {
    speaker: "",
    char: null,
    text: "Kỳ thi gồm 3 phần: Từ Vựng (Wordle), Nghe Hiểu (Listening), và Phản Xạ Âm Thanh (Rhythm)."
  },
  {
    speaker: "",
    char: null,
    text: "Hãy cố gắng hết sức — kết quả sẽ ảnh hưởng đến lớp học Tiếng Anh của bạn!"
  },
  {
    // ── ĐIỂM KẾT NỐI MINI-GAME ──
    // Engine sẽ tạm dừng ở đây, gọi onAction("start_english_exam")
    // Sau khi hoàn thành, game.state.english_class sẽ được gán và story tiếp tục theo next
    id: "english_exam_start",
    char: null,
    speaker: "",
    text: "",
    action: "start_english_exam",
    next: "exam_result_announce"
  },

  // ── KẾT QUẢ XẾP LỚP ──
  {
    id: "exam_result_announce",
    char: null,
    speaker: "",
    text: "Kết quả đã được tổng hợp xong. Hạo Nhiên hồi hộp nhìn vào màn hình thông báo..."
  },
  {
    speaker: "Hạo Nhiên",
    char: "hao_nhien",
    speakerColor: "var(--tdt-blue)",
    // {english_class} sẽ được thay thế bởi engine từ game.state.english_class
    text: "Mình được xếp vào: {english_class}!",
    next: "exam_result_detail"
  },

  {
    id: "exam_result_detail",
    char: null,
    speaker: "",
    text: "Dù kết quả thế nào, Hạo Nhiên vẫn cảm thấy hào hứng với những ngày tháng phía trước tại TDTU..."
  },
  {
    speaker: "Hạo Nhiên",
    char: "hao_nhien",
    speakerColor: "var(--tdt-blue)",
    text: "TDTU ơi, mình đến rồi đây! Hành trình thực sự của mình tại đây bắt đầu từ hôm nay!"
  },
  {
    speaker: "",
    char: null,
    text: "(Hết phần Demo! Cảm ơn bạn đã trải nghiệm TDTU: Ordinary Days 🎓)",
    next: "title_screen"
  }
];
