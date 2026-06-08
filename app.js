// Supabase config — replace with your values or set via environment variables
const SUPABASE_URL = 'https://glijwblkhiahhgiwkpin.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsaWp3YmxraGlhaGhnaXdrcGluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDM5NTMsImV4cCI6MjA5NjUxOTk1M30.b9Lsp3Nw09puy2Ni5ekdTwJFi-GI7AgdIgbbOkUt8PQ';

let supabase = null;

function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase client not loaded');
    return false;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return true;
}

// ——— Public form (index.html) ———
async function initForm() {
  const form = document.getElementById('messageForm');
  const fileInput = document.getElementById('images');
  const fileLabel = document.getElementById('fileLabel');
  const filePreview = document.getElementById('filePreview');
  const submitBtn = document.getElementById('submitBtn');
  const status = document.getElementById('status');
  let selectedFiles = [];

  if (!initSupabase()) return;

  // Drag & drop
  ['dragenter', 'dragover'].forEach(e => fileLabel.addEventListener(e, ev => {
    ev.preventDefault(); fileLabel.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach(e => fileLabel.addEventListener(e, ev => {
    ev.preventDefault(); fileLabel.classList.remove('dragover');
  }));
  fileLabel.addEventListener('drop', ev => {
    Array.from(ev.dataTransfer.files).forEach(f => addFile(f));
  });

  fileInput.addEventListener('change', ev => {
    Array.from(ev.target.files).forEach(f => addFile(f));
    ev.target.value = '';
  });

  function addFile(file) {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }
    if (selectedFiles.length >= 3) { alert('Maximum 3 images'); return; }
    selectedFiles.push(file);
    renderPreviews();
  }

  function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderPreviews();
  }

  function renderPreviews() {
    filePreview.innerHTML = '';
    selectedFiles.forEach((file, i) => {
      const url = URL.createObjectURL(file);
      const div = document.createElement('div');
      div.className = 'preview-item';
      div.innerHTML = `<img src="${url}" alt="Preview"><button type="button" aria-label="Remove">&times;</button>`;
      div.querySelector('button').onclick = () => removeFile(i);
      filePreview.appendChild(div);
    });
  }

  async function uploadImages(messageId, files) {
    const uploads = files.map((file, i) => {
      const ext = file.name.split('.').pop().toLowerCase();
      const filename = `${messageId}/${i}.${ext}`;
      return supabase.storage.from('images').upload(filename, file, {
        contentType: file.type,
        upsert: false
      });
    });
    const results = await Promise.all(uploads);
    const errors = results.filter(r => r.error);
    if (errors.length) throw new Error('Image upload failed: ' + errors[0].error.message);
    return results.map(r => r.data.path);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const message = document.getElementById('message').value.trim();
    if (!username || !message) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    status.className = 'status';
    status.textContent = '';

    try {
      // 1. Insert message record
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .insert({ username, content: message })
        .select('id')
        .single();
      if (msgError) throw msgError;

      // 2. Upload images if any
      if (selectedFiles.length > 0) {
        await uploadImages(msgData.id, selectedFiles);
      }

      status.className = 'status success';
      status.textContent = 'Message sent successfully!';
      form.reset();
      selectedFiles = [];
      renderPreviews();
    } catch (err) {
      console.error(err);
      status.className = 'status error';
      status.textContent = 'Failed to send: ' + err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });
}

// ——— Admin dashboard (admin.html) ———
async function initAdmin() {
  if (!initSupabase()) return;

  const grid = document.getElementById('messagesGrid');
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('emptyState');
  const stats = document.getElementById('stats');
  const errorBanner = document.getElementById('errorBanner');
  const refreshBtn = document.getElementById('refreshBtn');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const modal = document.getElementById('imageModal');
  const modalImg = modal.querySelector('img');

  async function loadMessages() {
    loading.style.display = 'block';
    grid.style.display = 'none';
    emptyState.style.display = 'none';
    errorBanner.classList.remove('show');

    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { count: imgCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .not('image_paths', 'is', null);

      stats.textContent = `${messages.length} message${messages.length !== 1 ? 's' : ''}${imgCount ? ` • ${imgCount} with images` : ''}`;

      if (!messages.length) {
        loading.style.display = 'none';
        emptyState.style.display = 'block';
        return;
      }

      grid.innerHTML = '';
      for (const msg of messages) {
        const card = document.createElement('div');
        card.className = 'message-card';
        let imagesHtml = '';
        if (msg.image_paths && msg.image_paths.length) {
          imagesHtml = '<div class="message-images">' + msg.image_paths.map(path => {
            const url = `${SUPABASE_URL}/storage/v1/object/public/images/${path}`;
            return `<img class="message-image" src="${url}" alt="Image" data-full="${url}">`;
          }).join('') + '</div>';
        }
        card.innerHTML = `
          <div class="message-header">
            <span class="username">${escapeHtml(msg.username)}</span>
            <span class="timestamp">${formatDate(msg.created_at)}</span>
          </div>
          <div class="message-text">${escapeHtml(msg.content)}</div>
          ${imagesHtml}
        `;
        grid.appendChild(card);
      }

      // Image modal
      grid.querySelectorAll('.message-image').forEach(img => {
        img.addEventListener('click', () => {
          modalImg.src = img.dataset.full;
          modal.classList.add('open');
        });
      });
      modal.addEventListener('click', () => modal.classList.remove('open'));

      loading.style.display = 'none';
      grid.style.display = 'grid';
    } catch (err) {
      console.error(err);
      loading.style.display = 'none';
      errorBanner.textContent = 'Failed to load: ' + err.message;
      errorBanner.classList.add('show');
    }
  }

  refreshBtn.addEventListener('click', loadMessages);
  exportBtn.addEventListener('click', async () => {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (error) return alert('Export failed: ' + error.message);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `messages-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  });
  clearBtn.addEventListener('click', async () => {
    if (!confirm('Delete ALL messages and images? This cannot be undone.')) return;
    try {
      // Delete all images from storage
      const { data: allMessages } = await supabase.from('messages').select('image_paths');
      const allPaths = allMessages?.flatMap(m => m.image_paths || []) || [];
      if (allPaths.length) await supabase.storage.from('images').remove(allPaths);
      // Delete all messages
      await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      loadMessages();
    } catch (err) {
      alert('Clear failed: ' + err.message);
    }
  });

  loadMessages();
}

// ——— Utils ———
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ——— Auto-init based on page ———
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('messageForm')) initForm();
  if (document.getElementById('messagesGrid')) initAdmin();
});