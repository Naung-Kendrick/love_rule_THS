const SUPABASE_URL = 'https://ovdkuwfiepkmyfdywwxm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gGqSp3pL_o8WNKt729_5rw_fPZ3z2a7';

let supabaseClient = null;
let supabaseReady = false;
let roomCode = null;
let realtimeSubscription = null;

function initSupabase() {
  if (supabaseClient) return;
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } }
  });
  supabaseReady = true;
  document.dispatchEvent(new CustomEvent('supabase-ready'));
}

function getRoomCode() {
  return localStorage.getItem('roomCode');
}

function setRoomCode(code) {
  localStorage.setItem('roomCode', code);
}

async function loadFromSupabase(code) {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient
    .from('couple_data')
    .select('data')
    .eq('room_code', code)
    .single();
  if (error || !data) return null;
  return data.data;
}

async function saveToSupabase(code, data) {
  if (!supabaseClient) return;
  const payload = {
    room_code: code,
    data: data,
    updated_at: new Date().toISOString()
  };
  await supabaseClient
    .from('couple_data')
    .upsert(payload, { onConflict: 'room_code' });
}

async function uploadPhotoToSupabase(base64Data, fileName) {
  if (!supabaseClient) return null;
  const blob = await (await fetch(base64Data)).blob();
  const { data, error } = await supabaseClient
    .storage
    .from('memories')
    .upload(fileName, blob, { upsert: true });
  if (error) return null;
  const { data: urlData } = supabaseClient
    .storage
    .from('memories')
    .getPublicUrl(fileName);
  return urlData.publicUrl;
}

function subscribeToRoom(code, onUpdate) {
  if (!supabaseClient) return;
  if (realtimeSubscription) {
    supabaseClient.removeChannel(realtimeSubscription);
  }
  realtimeSubscription = supabaseClient
    .channel(`room-${code}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'couple_data', filter: `room_code=eq.${code}` },
      async (payload) => {
        if (payload.new && payload.new.data) {
          onUpdate(payload.new.data);
        }
      }
    )
    .subscribe();
}

function unsubscribeFromRoom() {
  if (realtimeSubscription && supabaseClient) {
    supabaseClient.removeChannel(realtimeSubscription);
    realtimeSubscription = null;
  }
}
