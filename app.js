// Función para configurar el nombre de usuario
function setUserName() {
  const userName = prompt('Por favor, ingresa tu nombre:');
  if (userName) {
    localStorage.setItem('userName', userName);
    return userName;
  }
  return 'Usuario';
}

// Verificar si ya existe un nombre de usuario
if (!localStorage.getItem('userName')) {
  setUserName();
} 