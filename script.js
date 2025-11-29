
import { supabase } from './supabase-init.js';

// Helper to create LI
function createLi(text) {
  const li = document.createElement('li');
  li.textContent = text;
  return li;
}

// SIGNUP
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const payload = {
      parent: f.parent.value || null,
      email: f.email.value || null,
      student: f.student.value || null,
      country: f.country ? f.country.value : null,
      grade: f.grade ? f.grade.value : null,
      subject: f.subject ? f.subject.value : null,
      plan: f.plan ? f.plan.value : null,
      note: f.note ? f.note.value : null
    };
    try {
      const { data, error } = await supabase
        .from('registrations')
        .insert([payload]);
      if (error) throw error;
      document.getElementById('signupMsg').textContent = 'Thanks! Your request has been received.';
      f.reset();
    } catch (err) {
      console.error(err);
      document.getElementById('signupMsg').textContent = 'Error saving registration (see console).';
    }
  });
}

// INDEX: load current registrations and listen for changes
const freeList = document.getElementById('free-list');
const fullList = document.getElementById('full-list');

async function loadLists() {
  if (!freeList && !fullList) return;
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (freeList) freeList.innerHTML = '';
    if (fullList) fullList.innerHTML = '';
    data.forEach(r => {
      const text = `${r.student || '(no name)'} – ${r.grade || ''} (${r.subject || ''})`;
      if (r.plan === 'free' && freeList) freeList.appendChild(createLi(text));
      else if (r.plan === 'full' && fullList) fullList.appendChild(createLi(text));
    });
  } catch (err) {
    console.error('Load lists error', err);
  }
}

// Realtime subscription to INSERT/DELETE on registrations
function subscribeRealtime() {
  try {
    supabase
      .channel('public:registrations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registrations' }, payload => {
        loadLists();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'registrations' }, payload => {
        loadLists();
      })
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscribe error', err);
  }
}

loadLists();
subscribeRealtime();

// ADMIN page: render, export CSV, delete
const regTableBody = document.querySelector('#regTable tbody');
if (regTableBody) {
  async function refreshTable() {
    regTableBody.innerHTML = '';
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    data.forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx+1}</td>
        <td>${r.student || ''}</td>
        <td>${r.grade || ''}</td>
        <td>${r.subject || ''}</td>
        <td>${r.plan || ''}</td>
        <td>${r.email || ''}</td>
        <td>${r.created_at || ''}</td>
        <td><button data-id="${r.id}" class="del-btn">Delete</button></td>`;
      regTableBody.appendChild(tr);
    });
    document.querySelectorAll('.del-btn').forEach(btn=>{
      btn.addEventListener('click', async function(){
        const id = this.getAttribute('data-id');
        if (!confirm('Delete this registration?')) return;
        const { error } = await supabase.from('registrations').delete().eq('id', id);
        if (error) { alert('Delete failed'); console.error(error); }
        else refreshTable();
      });
    });
  }

  document.getElementById('exportCsv').addEventListener('click', async () => {
    const { data, error } = await supabase.from('registrations').select('*').order('created_at', { ascending: false });
    if (error) { alert('Export failed'); console.error(error); return; }
    if (!data.length) { alert('No registrations'); return; }
    const headers = ['student','grade','subject','plan','email','note','created_at'];
    const rows = data.map(r => headers.map(h => `"${((r[h]||'')+'').replace(/"/g,'""')}"`).join(','));
    const csv = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'registrations.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('clearAll').addEventListener('click', async () => {
    if (!confirm('Delete ALL registrations? This cannot be undone.')) return;
    const { data, error } = await supabase.from('registrations').select('id');
    if (error) { alert('Clear failed'); console.error(error); return; }
    for (const r of data) {
      await supabase.from('registrations').delete().eq('id', r.id);
    }
    refreshTable();
  });

  refreshTable();
}
