// Form submission logic
const form = document.getElementById('add-movie-form');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-btn');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        const formData = new FormData(form);

        try {
            const genre = formData.get('genero');
            // Using API_BASE and API_KEY from app.js (which should be loaded before)
            const res = await fetch(`${API_BASE}/movies`, {
                method: 'POST',
                headers: {
                    'x-api-key': API_KEY
                },
                body: formData
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt);
            }

            alert('¡Película añadida correctamente!');
            window.location.href = `store.html?genre=${encodeURIComponent(genre)}`;
        } catch (err) {
            console.error(err);
            alert('Error al añadir película: ' + err.message);
            btn.disabled = false;
            btn.textContent = 'Añadir Película';
        }
    });
}
