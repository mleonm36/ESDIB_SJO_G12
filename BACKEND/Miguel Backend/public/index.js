const API_BASE_LOCAL = '/api';
const API_KEY_LOCAL = '5c2d9aae9f04abe1a448680b38c56f967c606be1c12bf5d97459788b2cd02f73';

async function apiFetchLocal(path, options = {}) {
    const res = await fetch(`${API_BASE_LOCAL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY_LOCAL,
            ...(options.headers || {})
        }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function obtenerFotoPrincipalIndex(pet) {
    if (Array.isArray(pet.photos)) {
        const withUrl = pet.photos.find(ph => ph && ph.url);
        if (withUrl) return withUrl.url;
    }
    const id = pet._id || pet.id;
    if (id) {
        try {
            const arr = await apiFetchLocal(`/pets/${id}/photos`, { method: "GET" });
            const withUrl = arr.find(ph => ph && ph.url);
            if (withUrl) return withUrl.url;
        } catch (e) { console.warn(e); }
    }
    return "imagenes/kora-perro.jpg";
}

async function cargarMascotasViejas() {
    const cont = document.getElementById("older-pets-container");

    try {
        const mascotas = await apiFetchLocal("/pets");


        const adoptables = mascotas
            .filter(m => m.status !== 'lost')
            .sort((a, b) => (b.edad || 0) - (a.edad || 0));

        const top4 = adoptables.slice(0, 3);

        if (top4.length === 0) {
            cont.innerHTML = "<p>No hay mascotas disponibles.</p>";
            return;
        }

        cont.innerHTML = "";

        for (const p of top4) {
            const foto = await obtenerFotoPrincipalIndex(p);
            const link = p.tipo === 'Perro' ? 'adopcion-perros.html' :
                (p.tipo === 'Gato' ? 'adopcion-gatos.html' : 'adopcion-otros.html');

            const html = `
                <a href="${link}">
                    <img class="mascotas-img" src="${foto}" alt="${p.nombre}" title="${p.nombre} (${p.edad || '?'} años)">
                </a>
             `;
            
            cont.insertAdjacentHTML('beforeend', html);
        }

    } catch (e) {
        console.error(e);
        cont.innerHTML = "<p>Error al cargar mascotas.</p>";
    }
}

document.addEventListener("DOMContentLoaded", cargarMascotasViejas);