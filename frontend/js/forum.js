(function () {
    // CONFIG
    // CONFIG - Detectar entorno (Igual que en app.js)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE = (isLocal && window.location.port !== '4000') 
      ? 'http://localhost:4000/api' 
      : '/api';
    const API_KEY = '5929e0dbebc941dc3124dd37c7248acca821170a522179775118ffe50fbf19c0';

    const q = (id) => document.getElementById(id);

    async function apiFetch(path, options = {}) {
        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...(options.headers || {}) }
        });
        if (!res.ok) {
            const msg = await res.text().catch(() => 'Error');
            throw new Error(msg || 'Error de red');
        }
        return res.json();
    }

    async function loadComments() {
        const list = q('comments-list');
        if (!list) return;
        list.innerHTML = '<p style="text-align:center; color:#ccc;">Cargando...</p>';

        try {
            const comments = await apiFetch('/comments', { method: 'GET' });
            list.innerHTML = '';

            if (!comments || comments.length === 0) {
                list.innerHTML = '<p style="text-align:center; color:#ccc;">Sé el primero en comentar.</p>';
                return;
            }

            comments.forEach(c => {
                const li = document.createElement('li');
                li.className = 'comment-item';

                const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleString() : '';

                li.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-author">${escapeHtml(c.author)}</span>
                        <span class="comment-date">${dateStr}</span>
                    </div>
                    <div class="comment-text">${escapeHtml(c.text)}</div>
                `;
                list.appendChild(li);
            });

        } catch (e) {
            console.error(e);
            list.innerHTML = '<p style="color:red; text-align:center;">Error al cargar comentarios</p>';
        }
    }

    async function submitComment(ev) {
        ev.preventDefault();
        const btn = q('post-button');
        btn.disabled = true;

        const author = q('author').value.trim();
        const text = q('text').value.trim();

        if (!author || !text) {
            alert('Por favor completa ambos campos.');
            btn.disabled = false;
            return;
        }

        try {
            await apiFetch('/comments', {
                method: 'POST',
                body: JSON.stringify({ author, text })
            });

            // Limpiar form y recargar
            q('comment-form').reset();
            await loadComments();

        } catch (e) {
            alert('Error al publicar: ' + e.message);
        } finally {
            btn.disabled = false;
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    document.addEventListener('DOMContentLoaded', () => {
        const form = q('comment-form');
        if (form) {
            loadComments();
            form.addEventListener('submit', submitComment);
        }
    });
})();
