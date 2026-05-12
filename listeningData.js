/**
 * Database for Listening Mini-game (Lyrics Cloze Test)
 *
 * Timestamps (startTime/endTime) are calibrated for "Hello Vietnam" by Phạm Quỳnh Anh.
 * If lyrics feel off, adjust startTime values in small increments (±0.5s) to fine-tune.
 * Blanks are marked with [word] — the matching answer must appear in `answers[]` at the same position.
 */
export const listeningData = [
  {
    id: "hello-vietnam",
    title: "Hello Vietnam",
    artist: "Phạm Quỳnh Anh",
    audioSrc: "/assets/audio/hello_vietnam.mp3",
    coverSrc: "/assets/logo/feg_logo.png",
    difficulty: "medium",

    // ──────────────────────────────────────────────
    // VERSE 1
    // ──────────────────────────────────────────────
    lyrics: [
      {
        startTime: 12.0,
        endTime: 17.0,
        text: "Tell me all about this [name], that is [difficult] to say",
        answers: ["name", "difficult"]
      },
      {
        startTime: 17.0,
        endTime: 22.5,
        text: "It was [given] me the [day] I was born",
        answers: ["given", "day"]
      },
      {
        startTime: 22.5,
        endTime: 27.0,
        text: "Want to know about the [stories] of the [empire] of old",
        answers: ["stories", "empire"]
      },
      {
        startTime: 27.0,
        endTime: 33.0,
        text: "My [eyes] say more of me than what you [dare] to say",
        answers: ["eyes", "dare"]
      },

      // ──────────────────────────────────────────────
      // PRE-CHORUS 1
      // ──────────────────────────────────────────────
      {
        startTime: 33.0,
        endTime: 37.6,
        text: "All I know of [you] is all the [sights] of war",
        answers: ["you", "sights"]
      },
      {
        startTime: 37.6,
        endTime: 43.0,
        text: "A film by [Coppola], the [helicopter's] roar",
        answers: ["Coppola", "helicopter's"]
      },

      // ──────────────────────────────────────────────
      // CHORUS 1
      // ──────────────────────────────────────────────
      {
        startTime: 43.0,
        endTime: 48.5,
        text: "One day I'll [touch] your [soil]",
        answers: ["touch", "soil"]
      },
      {
        startTime: 48.5,
        endTime: 53.7,
        text: "One day I'll [finally] know your [soul]",
        answers: ["finally", "soul"]
      },
      {
        startTime: 53.7,
        endTime: 59.0,
        text: "One day I'll [come] to you",
        answers: ["come"]
      },
      {
        startTime: 59.0,
        endTime: 67.0,
        text: "To say [hello]... [Vietnam]",
        answers: ["hello", "Vietnam"]
      },
      // Khổ 2
      {
        startTime: 67.0,
        endTime: 72.0,
        text: "Tell me all about my [color], my [hair] and my little feet",
        answers: ["color", "hair"]
      },
      {
        startTime: 72.0,
        endTime: 78.0,
        text: "That have [carried] me every [mile] of the way",
        answers: ["carried", "mile"]
      },
      {
        startTime: 78.0,
        endTime: 84.0,
        text: "Want to see your [houses], your [streets], show me all I do not know",
        answers: ["houses", "streets"]
      },
      {
        startTime: 84.0,
        endTime: 89.3,
        text: "[Wooden] sampans, [floating] markets, light of gold",
        answers: ["Wooden", "floating"]
      },
      // Điệp khúc 2
      {
        startTime: 89.3,
        endTime: 94.0,
        text: "All I know of [you] is all the [sights] of war",
        answers: ["you", "sights"]
      },
      {
        startTime: 94.0,
        endTime: 99.0,
        text: "A film by [Coppola], the [helicopter's] roar",
        answers: ["Coppola", "helicopter's"]
      },
      {
        startTime: 99.0,
        endTime: 105.0,
        text: "One day I'll [touch] your [soil]",
        answers: ["touch", "soil"]
      },
      {
        startTime: 105.0,
        endTime: 110.0,
        text: "One day I'll [finally] know your [soul]",
        answers: ["finally", "soul"]
      },
      {
        startTime: 110.0,
        endTime: 115.6,
        text: "One day I'll [come] to you",
        answers: ["come"]
      },
      {
        startTime: 115.6,
        endTime: 120.0,
        text: "To say [hello]... [Vietnam]",
        answers: ["hello", "Vietnam"]
      },
      // Khổ 3
      {
        startTime: 122.0,
        endTime: 126.7,
        text: "And [Buddhas] made of [stone] watch over me",
        answers: ["Buddhas", "stone"]
      },
      {
        startTime: 126.7,
        endTime: 131.7,
        text: "My [dreams] they lead me through the [fields] of rice",
        answers: ["dreams", "fields"]
      },
      {
        startTime: 131.7,
        endTime: 136.7,
        text: "In [prayer], in the [light]... I see my kin.",
        answers: ["prayer", "light"]
      },
      {
        startTime: 136.7,
        endTime: 142.0,
        text: "I touch my [tree], my [roots], my begin",
        answers: ["tree", "roots"]
      },
      // Điệp khúc 3 & Kết
      {
        startTime: 142.0,
        endTime: 148.0,
        text: "One day I'll [touch] your [soil]",
        answers: ["touch", "soil"]
      },
      {
        startTime: 148.0,
        endTime: 153.0,
        text: "One day I'll [finally] know your [soul]",
        answers: ["finally", "soul"]
      },
      {
        startTime: 153.0,
        endTime: 162.7,
        text: "One day I'll [come] to you / To say [hello]... Vietnam",
        answers: ["come", "hello"]
      },
      {
        startTime: 162.7,
        endTime: 169.0,
        text: "One day I’ll [walk] your [soil]",
        answers: ["walk", "soil"]
      },
      {
        startTime: 169.0,
        endTime: 174.0,
        text: "One day I'll [finally] know my [soul]",
        answers: ["finally", "soul"]
      },
      {
        startTime: 174.0,
        endTime: 179.7,
        text: "One day I'll [come] to you",
        answers: ["come"]
      },
      {
        startTime: 179.7,
        endTime: 190.0,
        text: "To say [hello]... [Vietnam]",
        answers: ["hello", "Vietnam"]
      },
      {
        startTime: 190.0,
        endTime: 194.0,
        text: "To say [xin chào]… [Vietnam]",
        answers: ["xin chào", "Vietnam"]
      }
    ]
  }
];
