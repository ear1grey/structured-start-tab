export function attachStyleSheet(shadow:ShadowRoot, url = 'index.css'): void {
  const e = document.createElement('link');
  e.setAttribute('rel', 'stylesheet');
  e.setAttribute('type', 'text/css');
  e.setAttribute('href', url);
  shadow.append(e);
}

export function el(elemType: string, attrs = {}, text :string) :HTMLElement {
  const elem = document.createElement(elemType);

  Object.entries(attrs).forEach(item => {
    const s = item[0];
    elem.setAttribute(s, item[1] as string);
  });

  if (text) {
    elem.textContent = text;
  }
  return elem;
}
