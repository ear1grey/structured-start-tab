export function attachStyleSheet(shadow, url = 'index.css') {
    const e = document.createElement('link');
    e.setAttribute('rel', 'stylesheet');
    e.setAttribute('type', 'text/css');
    e.setAttribute('href', url);
    shadow.append(e);
}
export function el(elemType, attrs = {}, text) {
    const elem = document.createElement(elemType);
    Object.entries(attrs).forEach(item => {
        const s = item[0];
        elem.setAttribute(s, item[1]);
    });
    if (text) {
        elem.textContent = text;
    }
    return elem;
}
