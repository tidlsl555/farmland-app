const SUPABASE_URL = 'https://ipkmpypscwtrmnaycegr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZVybpOf8m_xI-IZ2SKeJqA_dwfVgukc';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
let currentUser = null;
let realtimeChannel = null;

const showMessage = (target, text, ok = false) => {
  target.textContent = text;
  target.style.color = ok ? '#27623f' : '#a04432';
};

async function refresh() {
  if (!currentUser) return;
  const [{ data: fields, error: fieldError }, { data: tasks, error: taskError }] = await Promise.all([
    db.from('fields').select('*').order('created_at', { ascending: false }),
    db.from('tasks').select('*').order('due_date', { ascending: true })
  ]);
  if (fieldError || taskError) {
    showMessage($('appMessage'), fieldError?.message || taskError?.message || '데이터를 불러오지 못했습니다.');
    return;
  }
  renderFields(fields || []);
  renderTasks(tasks || []);
}

function renderFields(fields) {
  $('fieldCount').textContent = fields.length;
  $('totalArea').textContent = Math.round(fields.reduce((sum, field) => sum + Number(field.area || 0), 0)).toLocaleString('ko-KR');
  $('fieldList').replaceChildren();
  if (!fields.length) return $('fieldList').append($('emptyTemplate').content.cloneNode(true));
  fields.forEach((field) => {
    const card = document.createElement('article');
    card.className = 'item-card';
    card.innerHTML = `<div class="grow"><strong></strong><small></small></div><button type="button">삭제</button>`;
    card.querySelector('strong').textContent = field.name;
    card.querySelector('small').textContent = `${Number(field.area).toLocaleString('ko-KR')}㎡${field.crop ? ` · ${field.crop}` : ''}`;
    card.querySelector('button').addEventListener('click', async () => {
      const { error } = await db.from('fields').delete().eq('id', field.id);
      if (error) showMessage($('appMessage'), error.message);
    });
    $('fieldList').append(card);
  });
}

function renderTasks(tasks) {
  $('openTaskCount').textContent = tasks.filter((task) => !task.completed).length;
  $('taskList').replaceChildren();
  if (!tasks.length) return $('taskList').append($('emptyTemplate').content.cloneNode(true));
  tasks.forEach((task) => {
    const card = document.createElement('article');
    card.className = `item-card${task.completed ? ' task-done' : ''}`;
    card.innerHTML = `<input class="check" type="checkbox"><div class="grow"><strong></strong><small></small></div><button type="button">삭제</button>`;
    const check = card.querySelector('.check');
    check.checked = task.completed;
    card.querySelector('strong').textContent = task.title;
    card.querySelector('small').textContent = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(`${task.due_date}T00:00:00`));
    check.addEventListener('change', async () => {
      const { error } = await db.from('tasks').update({ completed: check.checked }).eq('id', task.id);
      if (error) showMessage($('appMessage'), error.message);
    });
    card.querySelector('button').addEventListener('click', async () => {
      const { error } = await db.from('tasks').delete().eq('id', task.id);
      if (error) showMessage($('appMessage'), error.message);
    });
    $('taskList').append(card);
  });
}

async function setSession(session) {
  currentUser = session?.user || null;
  $('authSection').classList.toggle('hidden', Boolean(currentUser));
  $('dashboard').classList.toggle('hidden', !currentUser);
  $('logoutButton').classList.toggle('hidden', !currentUser);
  if (realtimeChannel) await db.removeChannel(realtimeChannel);
  if (!currentUser) return;
  realtimeChannel = db.channel(`farm-${currentUser.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fields' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, refresh)
    .subscribe();
  await refresh();
}

$('authForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { error } = await db.auth.signInWithPassword({ email: $('email').value, password: $('password').value });
  showMessage($('authMessage'), error ? error.message : '로그인했습니다.', !error);
});

$('signUpButton').addEventListener('click', async () => {
  const { error } = await db.auth.signUp({ email: $('email').value, password: $('password').value });
  showMessage($('authMessage'), error ? error.message : '가입 확인 메일을 확인해 주세요.', !error);
});

$('logoutButton').addEventListener('click', () => db.auth.signOut());

$('fieldForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { error } = await db.from('fields').insert({ user_id: currentUser.id, name: $('fieldName').value.trim(), area: Number($('fieldArea').value), crop: $('fieldCrop').value.trim() || null });
  if (error) return showMessage($('appMessage'), error.message);
  event.target.reset();
});

$('taskForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { error } = await db.from('tasks').insert({ user_id: currentUser.id, title: $('taskTitle').value.trim(), due_date: $('taskDate').value });
  if (error) return showMessage($('appMessage'), error.message);
  event.target.reset();
});

db.auth.onAuthStateChange((_event, session) => setSession(session));
db.auth.getSession().then(({ data }) => setSession(data.session));
