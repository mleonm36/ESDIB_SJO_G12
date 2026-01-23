// Estado global para los géneros adicionales
let otrosGeneros = [];

// Obtener API Key del localStorage (debería estar guardada en la app)
const API_KEY = localStorage.getItem('apiKey') || '';

// Referencia a elementos del DOM
const form = document.getElementById('formulario-pelicula');
const generoInput = document.getElementById('generoInput');
const addGeneroBtn = document.getElementById('addGeneroBtn');
const generosList = document.getElementById('generosList');
const messageBox = document.getElementById('messageBox');
const posterInput = document.getElementById('poster');
const previewPoster = document.getElementById('previewPoster');

// Preview de la imagen
posterInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      previewPoster.src = event.target.result;
      previewPoster.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    previewPoster.style.display = 'none';
  }
});

// Agregar género adicional
addGeneroBtn.addEventListener('click', () => {
  const genero = generoInput.value.trim();
  if (genero) {
    if (!otrosGeneros.includes(genero)) {
      otrosGeneros.push(genero);
      generoInput.value = '';
      renderGeneros();
    } else {
      showMessage('Este género ya ha sido agregado', 'error');
    }
  }
});

// Permitir Enter para agregar género
generoInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addGeneroBtn.click();
  }
});

// Renderizar lista de géneros
function renderGeneros() {
  generosList.innerHTML = '';
  if (otrosGeneros.length === 0) {
    generosList.innerHTML = '<p style="color: #999; text-align: center; padding: 1rem 0;">No hay géneros adicionales</p>';
    return;
  }
  
  otrosGeneros.forEach((genero, index) => {
    const item = document.createElement('div');
    item.className = 'genero-item';
    item.innerHTML = `
      <span>${genero}</span>
      <button type="button" onclick="removeGenero(${index})">Eliminar</button>
    `;
    generosList.appendChild(item);
  });
}

// Eliminar género
function removeGenero(index) {
  otrosGeneros.splice(index, 1);
  renderGeneros();
}

// Mostrar mensajes
function showMessage(message, type) {
  messageBox.textContent = message;
  messageBox.className = `message ${type}`;
  
  if (type === 'success') {
    setTimeout(() => {
      messageBox.className = 'message';
    }, 3000);
  }
}

// Enviar formulario
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const titulo = document.getElementById('titulo').value.trim();
  const genero = document.getElementById('genero').value.trim();
  const ano = document.getElementById('ano').value;
  const duracion = document.getElementById('duracion').value;
  const director = document.getElementById('director').value.trim();
  const sinopsis = document.getElementById('sinopsis').value.trim();
  const poster = document.getElementById('poster').files[0];

  // Validación
  if (!titulo || !genero || !ano || !duracion || !poster) {
    showMessage('Por favor completa todos los campos obligatorios (*)', 'error');
    return;
  }

  // Crear FormData
  const formData = new FormData();
  formData.append('titulo', titulo);
  formData.append('genero', genero);
  formData.append('ano', ano);
  formData.append('duracion', duracion);
  formData.append('otrosGeneros', JSON.stringify(otrosGeneros));
  formData.append('director', director || null);
  formData.append('sinopsis', sinopsis || null);
  formData.append('file', poster);

  try {
    const button = form.querySelector('.btn-submit');
    button.disabled = true;
    button.textContent = 'Insertando...';

    const response = await fetch('/api/pelicula', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al insertar la película');
    }

    showMessage(`✓ Película "${data.titulo}" insertada correctamente`, 'success');
    
    // Limpiar formulario
    form.reset();
    otrosGeneros = [];
    renderGeneros();
    previewPoster.style.display = 'none';
    
    button.disabled = false;
    button.textContent = 'INSERTAR PELÍCULA';
    
  } catch (error) {
    console.error('Error:', error);
    showMessage(`Error: ${error.message}`, 'error');
    
    const button = form.querySelector('.btn-submit');
    button.disabled = false;
    button.textContent = 'INSERTAR PELÍCULA';
  }
});

// Inicializar
renderGeneros();
