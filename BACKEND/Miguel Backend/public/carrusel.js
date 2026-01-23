const radios = document.querySelectorAll('.slider input[type="radio"]');
let current = 2; // Empieza en #t-3


document.getElementById('next-arrow').addEventListener('click', () => {
  current = (current + 1) % radios.length;  // pasa a la siguiente
  radios[current].checked = true; // activa la siguiente tarjeta
});

document.getElementById('prev-arrow').addEventListener('click', () => {
  current = (current - 1 + radios.length) % radios.length; // activa la siguiente tarjeta
  radios[current].checked = true; // activa la tarjeta anterior
});