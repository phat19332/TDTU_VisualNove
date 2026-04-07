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
    char: "hao_nhien", // Cố tình không truyền emotion để quay về trạng thái bình thường (hao_nhien.png)
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
    char: null, /* could use another sprite */
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
    text: "Hành trình tại TDTU của Hạo Nhiên vừa mới thực sự bắt đầu..."
  },
  {
    speaker: "",
    text: "(Hết phần Demo!)",
    next: "title_screen" // quay lại màn hình chính
  }
];
