export function prepareDrag() {
  const links = document.querySelectorAll('a');
  for (const link of links) {
    link.draggable = true;
  }
}
