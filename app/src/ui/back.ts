// Pila de "atrás": hojas y pantallas registran cómo cerrarse.
// La APK Android llama a window.npBack() al pulsar el botón físico; si devuelve false, la app se cierra.
const stack: (() => void)[] = [];

export function pushBack(fn: () => void) {
  stack.push(fn);
  return () => {
    const i = stack.lastIndexOf(fn);
    if (i >= 0) stack.splice(i, 1);
  };
}

window.npBack = () => {
  const fn = stack.pop();
  if (fn) {
    fn();
    return true;
  }
  return false;
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) window.npBack?.();
});
