// @ts-nocheck
// ============================================
// Supabase Client & API Helpers
// Time, Dreams, Trials & Us - Visual Novel
// ============================================

const SUPABASE_URL = 'https://wqslipfvtrkjnnlpxsic.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxc2xpcGZ2dHJram5ubHB4c2ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzY1MTUsImV4cCI6MjA5MTIxMjUxNX0.DtJlEA-lmpB4v5X6MQslgbky-d2S3xwyFHQixcin4zQ';
const STORAGE_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/game-assets`;

let supabaseClient = null;

/**
 * Hàm hỗ trợ lấy URL tài nguyên. 
 * Nếu path bắt đầu bằng /assets/ hoặc là tên file đơn giản, nó sẽ chuyển sang link Supabase.
 */
export function getAssetUrl(path) {
  if (!path || typeof path !== 'string') return path;
  if (path.startsWith('http')) return path; // Đã là URL ngoài
  
  // Tách tên file từ đường dẫn cũ (VD: /assets/backgrounds/abc.png -> abc.png)
  const filename = path.split('/').pop();
  
  // Nếu là đường dẫn cục bộ cũ hoặc chỉ là tên file, trỏ về Supabase Storage
  if (path.startsWith('/assets/') || !path.includes('/')) {
    return `${STORAGE_BASE_URL}/${filename}`;
  }
  
  return path;
}

/**
 * Khởi tạo Supabase Client (gọi sau khi CDN đã load)
 */
export function initSupabase() {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized');
    return true;
  }
  console.warn('⚠️ Supabase CDN chưa load, sẽ dùng dữ liệu local');
  return false;
}

/**
 * Đọc kịch bản game từ bảng `scripts` trên Supabase
 * Chuyển đổi từ format bảng sang format storyScript mà VNEngine hiểu
 */
export async function fetchScript() {
  if (!supabaseClient) return null;

  try {
    const { data, error } = await supabaseClient
      .from('scripts')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    // Chuyển đổi format bảng Supabase → format storyScript
    const script = data.map(row => {
      const line = {};

      if (row.scene_id)      line.id = row.scene_id;
      if (row.bg)            line.bg = row.bg;
      if (row.bgm)           line.bgm = row.bgm;
      
      // Xử lý nhân vật (Single char - backward compat)
      if (row.char_name !== null && row.char_name !== undefined) {
        if (row.char_name === '' || row.char_name === 'null') {
          line.char = null;
        } else {
          line.char = row.char_name;
        }
      }

      // Dual Character System (char_l ưu tiên hơn char_name)
      // Nếu char_l có dữ liệu → dùng char_l. Nếu char_l trống mà char_name có → dùng char_name làm char_l
      if (row.char_l !== null && row.char_l !== undefined && row.char_l !== '') {
        line.char_l = (row.char_l === 'null') ? null : row.char_l;
      } else if (row.char_name !== null && row.char_name !== undefined && row.char_name !== '') {
        // Fallback: char_name → char_l (tương thích ngược)
        line.char_l = (row.char_name === 'null') ? null : row.char_name;
      } else if (row.char_l === null || row.char_name === null) {
        // Người dùng gán null rõ ràng → ẩn nhân vật
        line.char_l = null;
      }
      if (row.char_r !== null && row.char_r !== undefined) {
        line.char_r = (row.char_r === '' || row.char_r === 'null') ? null : row.char_r;
      }
      if (row.emotion_l)     line.emotion_l = row.emotion_l;
      if (row.emotion_r)     line.emotion_r = row.emotion_r;
      
      if (row.emotion)       line.emotion = row.emotion;
      if (row.char_anim)     line.charAnim = row.char_anim;
      if (row.speaker)       line.speaker = row.speaker;
      if (row.speaker_color) line.speakerColor = row.speaker_color;
      
      line.text = row.dialogue || '';
      line.dialogue = row.dialogue || '';

      // Parse choices: Hỗ trợ cả Shorthand và JSON (Đa ngôn ngữ)
      if (row.choices && row.choices.trim() !== '') {
        try {
          const parsedChoices = JSON.parse(row.choices);
          // Nếu là JSON hợp lệ (VD: {"vi": "...", "en": "..."}), giữ nguyên dạng object
          line.choices = parsedChoices;
        } catch (e) {
          // Nếu không phải JSON, parse theo kiểu Shorthand (Text|id)
          line.choices = row.choices.split(';;').map(c => {
            const [text, next] = c.split('|');
            return { text: text ? text.trim() : '', next: next ? next.trim() : '' };
          });
        }
      }

      if (row.next_id) line.next = row.next_id;

      // Map additional state features
      if (row.bgm_lock !== undefined) line.bgm_lock = row.bgm_lock;
      if (row.cg_id !== undefined)   line.cg_id = row.cg_id;

      // SFX (Sound Effects)
      if (row.sfx !== null && row.sfx !== undefined) {
        line.sfx = row.sfx;
      }
      if (row.sfx_volume !== null && row.sfx_volume !== undefined) {
        line.sfx_volume = row.sfx_volume;
      }
      if (row.sfx_loop !== null && row.sfx_loop !== undefined) {
        line.sfx_loop = row.sfx_loop;
      }

      return line;
    });

    console.log(`✅ Loaded ${script.length} lines from Supabase`);
    return script;

  } catch (err) {
    console.error('❌ Lỗi fetch script từ Supabase:', err);
    return null;
  }
}

/**
 * Đọc danh sách nhạc từ bảng `music` trên Supabase
 * Trả về mảng [{id, title, artist, url, cover_url, category}]
 */
export async function fetchMusic() {
  if (!supabaseClient) return null;

  try {
    const { data, error } = await supabaseClient
      .from('music')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    console.log(`🎵 Loaded ${data.length} tracks from Supabase`);
    return data;

  } catch (err) {
    console.error('❌ Lỗi fetch music từ Supabase:', err);
    return [];
  }
}

/**
 * Lưu game (Save) lên Supabase
 * slot 0 được quy ước là Auto-save
 */
export async function saveGame(playerId, slot, scriptIndex, mcName = null, saveData = {}) {
  if (!supabaseClient) {
    console.warn('Supabase chưa kết nối, lưu vào LocalStorage');
    return false;
  }

  try {
    const { error } = await supabaseClient
      .from('saves')
      .upsert({
        player_id: playerId,
        slot: slot,
        script_index: scriptIndex,
        mc_name: mcName,
        save_data: saveData,
        saved_at: new Date().toISOString()
      }, {
        onConflict: 'player_id,slot'
      });

    if (error) throw error;
    console.log(`✅ Saved game: Player ${playerId}, Slot ${slot}, Index ${scriptIndex}`);
    return true;

  } catch (err) {
    console.error('❌ Lỗi save game:', err);
    return false;
  }
}

/**
 * Tải game (Load) từ Supabase
 */
export async function loadGame(playerId, slot) {
  if (!supabaseClient) return null;

  try {
    const { data, error } = await supabaseClient
      .from('saves')
      .select('*')
      .eq('player_id', playerId)
      .eq('slot', slot)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data || null;

  } catch (err) {
    console.error('❌ Lỗi load game:', err);
    return null;
  }
}

/**
 * Láy dữ liệu toàn cục (Gallery, Unlocks) từ Supabase
 */
export async function fetchGlobalData(playerId) {
  if (!supabaseClient || !playerId) return null;

  try {
    const { data, error } = await supabaseClient
      .from('global_player_data')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (err) {
    console.error('❌ Lỗi fetch global data:', err);
    return null;
  }
}

/**
 * Lưu dữ liệu toàn cục lên Supabase
 */
export async function saveGlobalData(playerId, globalData) {
  if (!supabaseClient || !playerId) return false;

  try {
    const { error } = await supabaseClient
      .from('global_player_data')
      .upsert({
        player_id: playerId,
        unlocked_cgs: globalData.unlocked_cgs || [],
        achievements: globalData.achievements || [],
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('❌ Lỗi save global data:', err);
    return false;
  }
}

/**
 * Lấy tất cả slots đã lưu của một người chơi
 */
export async function getAllSaves(playerId) {
  if (!supabaseClient) return [];

  try {
    const { data, error } = await supabaseClient
      .from('saves')
      .select('*')
      .eq('player_id', playerId)
      .order('slot', { ascending: true });

    if (error) throw error;
    return data || [];

  } catch (err) {
    console.error('❌ Lỗi lấy danh sách saves:', err);
    return [];
  }
}
