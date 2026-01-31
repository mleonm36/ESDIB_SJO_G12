// Specific logic for Detail Page
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        alert('No se especificó película');
        window.location.href = 'index.html';
        return;
    }

    try {
        const data = await apiFetch('/movies');
        const movie = data.find(m => m._id === id);

        if (!movie) {
            document.getElementById('detail-title').textContent = 'Película no encontrada';
            return;
        }

        // Populate UI
        document.getElementById('detail-title').textContent = movie.titulo;
        const posterUrl = movie.poster || ((movie.photos && movie.photos[0]) ? movie.photos[0].url : '');
        document.getElementById('detail-poster').src = posterUrl;

        document.getElementById('detail-year').textContent = movie.ano || 'N/A';
        document.getElementById('detail-duration').textContent = movie.duracion || 'N/A';
        document.getElementById('detail-year').textContent = movie.ano || 'N/A';
        document.getElementById('detail-duration').textContent = movie.duracion || 'N/A';
        document.getElementById('detail-price').textContent = (movie.precio !== undefined && movie.precio !== null) ? movie.precio + ' €' : 'Precio no disponible';
        document.getElementById('detail-genre').textContent = movie.genero;
        const genreLink = document.getElementById('detail-genre-link');
        if (genreLink) {
            genreLink.href = `store.html?genre=${encodeURIComponent(movie.genero)}`;
        }

        document.getElementById('detail-synopsis').textContent = movie.sinopsis || 'Sin sinopsis.';
        document.getElementById('detail-director').textContent = movie.director || 'Desconocido';
        document.getElementById('detail-subgenres').textContent = movie.subgenero || '';

        // Back button
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.onclick = (e) => {
                e.preventDefault();
                window.location.href = 'index.html';
            };
        }

        // Add to Cart
        const cartBtn = document.getElementById('add-cart-btn');
        if (cartBtn) {
            cartBtn.onclick = () => {
                addToCart({
                    id: movie._id,
                    title: movie.titulo,
                    poster: posterUrl,
                    price: movie.precio
                });
            };
        }

    } catch (e) {
        console.error(e);
    }
});
