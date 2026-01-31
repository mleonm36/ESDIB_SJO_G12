// CONFIG - Detectar entorno
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// Si estamos en localhost pero NO en el puerto 4000 (ej: Live Server en 5500), usamos backend local 4000.
// Si estamos en produccion (Azure) o en local puerto 4000, usamos ruta relativa '/api'.
const API_BASE = (isLocal && window.location.port !== '4000') 
  ? 'http://localhost:4000/api' 
  : '/api';
const API_KEY =
  "5929e0dbebc941dc3124dd37c7248acca821170a522179775118ffe50fbf19c0";

// Helpers
const q = (id) => document.getElementById(id);

// Init Log
console.log("🚀 app.js ejecutándose v3");

// Toast Notification System
window.showToast = (message, type = "success") => {
  let toast = document.getElementById("toast-notification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  // Añadir clase según el tipo
  toast.className = "toast";
  if (type === "success") {
    toast.style.background = "rgb(242, 192, 69)";
    toast.style.color = "black";
  } else if (type === "error") {
    toast.style.background = "#e50914";
    toast.style.color = "white";
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
};

// API Fetch
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "Error");
      throw new Error(msg || "Error de red");
    }
    return res.status !== 204 ? res.json() : null;
  } catch (err) {
    console.error("Error en apiFetch:", err);
    throw err;
  }
}

// Global Cart State
let cart = JSON.parse(localStorage.getItem("rewatch_cart")) || [];

function saveCart() {
  localStorage.setItem("rewatch_cart", JSON.stringify(cart));
  updateCartUI();
}

window.addToCart = (item) => {
  cart.push(item);
  saveCart();
  window.showToast(`"${item.title || item.titulo}" añadida al carrito`);
};

window.removeFromCart = (index) => {
  cart.splice(index, 1);
  saveCart();
};

function updateCartUI() {
  // Update cart count badge
  const countEl = document.getElementById("cart-count");
  if (countEl) {
    countEl.style.display = cart.length === 0 ? "none" : "flex";
    countEl.textContent = cart.length;
  }

  // Update cart items list (only on cart page)
  const itemsEl = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  if (!itemsEl) return;

  itemsEl.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    itemsEl.innerHTML =
      '<div style="color:#666; text-align:center; padding:40px; font-size:1.2rem;">Tu carrito está vacío</div>';
  } else {
    cart.forEach((item, index) => {
      const price = item.price !== undefined ? parseFloat(item.price) : 9.99;
      total += price;

      const div = document.createElement("div");
      div.className = "cart-item";
      div.innerHTML = `
        <img src="${item.poster}" alt="cover">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title || item.titulo}</div>
          <div class="cart-item-price">${price.toFixed(2)} €</div>
        </div>
        <div class="remove-item" data-index="${index}" style="cursor:pointer; color:#e50914; font-size:1.5rem; font-weight:bold; padding:10px;" title="Eliminar">✕</div>
      `;
      itemsEl.appendChild(div);
    });

    // Add event delegation for removal
    itemsEl.querySelectorAll(".remove-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.getAttribute("data-index"));
        window.removeFromCart(index);
      });
    });
  }

  if (totalEl) totalEl.textContent = total.toFixed(2) + " €";
}

// Global checkout function
window.checkoutAction = () => {
  console.log("Iniciando checkout...");

  if (cart.length === 0) {
    window.showToast("El carrito está vacío", "error");
    return;
  }

  // Check for NGO modal
  const modal = document.getElementById("ong-modal");
  if (modal) {
    window.openOngModal();
    return;
  }

  const totalDisplay =
    document.getElementById("cart-total")?.textContent || "su compra";

  if (confirm(`¿Desea finalizar el pago de ${totalDisplay}?`)) {
    // Vaciar carrito
    cart = [];
    saveCart();

    // Mostrar notificación de éxito
    window.showToast(
      "¡Compra realizada con éxito! Gracias por tu compra 🎬",
      "success",
    );

    // Si estamos en la página del carrito, actualizar la vista
    if (window.location.pathname.includes("cart.html")) {
      updateCartUI();
    }
  }
};

window.openOngModal = () => {
  const modal = document.getElementById("ong-modal");
  if (modal) {
    modal.style.display = "flex";
  }
};

window.closeOngModal = () => {
  const modal = document.getElementById("ong-modal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.finalizeWithOng = (ongName) => {
  window.closeOngModal();

  // Proceed with checkout logic
  const totalDisplay =
    document.getElementById("cart-total")?.textContent || "su compra";

  // Optional: confirm final step or just do it? User said "pulsar uno de ellos para que te deje finalizar la compra"
  // I'll assume clicking the button finalizes it immediately.

  cart = [];
  saveCart();

  window.showToast(
    `¡Compra finalizada! Has colaborado con: ${ongName}`,
    "success",
  );

  if (window.location.pathname.includes("cart.html")) {
    updateCartUI();
  }
};

// Main Load Function
async function cargarLista() {
  const grid = document.getElementById("movies-grid");
  console.log("Intentando cargar lista de películas...");

  try {
    const data = await apiFetch("/movies", { method: "GET" });
    console.log("Datos recibidos:", data ? data.length : 0, "películas");

    let movies = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : [];
    window.allMovies = movies;

    const urlParams = new URLSearchParams(window.location.search);
    const genreFilter = urlParams.get("genre");

    if (genreFilter) {
      movies = movies.filter((p) => p.genero === genreFilter);
      const titleEl =
        document.getElementById("genre-header-title") ||
        document.querySelector(".title");
      if (titleEl) titleEl.textContent = genreFilter.toUpperCase();
    }

    renderMovies(movies);
  } catch (e) {
    console.error("Error fatal al cargar películas:", e);
    if (grid) {
      grid.innerHTML = `<div style="color:red; padding: 20px; text-align:center;">
        <h3>Error al conectar con la base de datos</h3>
        <p>${e.message}</p>
      </div>`;
    }
  }
}

function renderMovies(movieList) {
  const grid = document.getElementById("movies-grid");
  if (!grid) {
    console.error("No se encontró el elemento #movies-grid");
    return;
  }

  grid.innerHTML = "";

  if (movieList.length === 0) {
    grid.innerHTML =
      '<p style="color:#fff; text-align:center; width:100%;">No hay películas disponibles.</p>';
    return;
  }

  movieList.forEach((p) => {
    const card = document.createElement("div");
    card.className = "movie-card";
    card.onclick = () => {
      window.location.href = `movie.html?id=${p._id}`;
    };

    const posterUrl =
      p.poster || "https://via.placeholder.com/300x450?text=Sin+Poster";

    card.innerHTML = `
      <img src="${posterUrl}" class="movie-poster" alt="${p.titulo}">
      <div class="movie-info">
        <div class="movie-title">${p.titulo || "Sin Título"}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM cargado, iniciando app...");

  // Resetear estado del menú al cargar (solución problema back button)
  const menuToggle = document.getElementById("menu-toggle");
  if (menuToggle) {
    menuToggle.checked = false;
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }

  // Si estamos en la página de inicio o tienda que tiene el grid
  if (document.getElementById("movies-grid")) {
    cargarLista();
  }

  updateCartUI();

  // Botón de checkout
  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", window.checkoutAction);
  }

  // Buscador
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      if (window.allMovies) {
        const filtered = window.allMovies.filter((p) =>
          (p.titulo || "").toLowerCase().includes(term),
        );
        renderMovies(filtered);
      }
    });
  }

  // Prevent scrolling when menu is open references the already declared variable 'menuToggle'
  if (menuToggle) {
    menuToggle.addEventListener('change', (e) => {
      const overflowState = e.target.checked ? 'hidden' : '';
      document.body.style.overflow = overflowState;
      document.documentElement.style.overflow = overflowState; // Lock html as well for broader support
    });
  }
});
