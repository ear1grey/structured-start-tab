let tip;
let OPTS;
const gap = 20;
export function reposition(e, messageOverride) {
    if (!OPTS.showToolTips)
        return;
    tip.textContent = messageOverride ?? e.target.dataset.info ?? '';
    tip.style.setProperty('visibility', 'inherit');
    let x = e.clientX;
    let y = e.clientY;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    if (x >= centerX) {
        x = x - tip.clientWidth - gap;
    }
    else {
        x = x + gap;
    }
    if (y >= centerY) {
        y = y - tip.clientHeight - gap;
    }
    else {
        y = y + gap;
    }
    document.documentElement.style.setProperty('--tool-tip-left', `${x}px`);
    document.documentElement.style.setProperty('--tool-tip-top', `${y}px`);
}
export function hide() {
    tip.style.setProperty('visibility', 'hidden');
}
export function prepare(O, selector = '[data-info]') {
    OPTS = O;
    const things = document.querySelectorAll(selector);
    for (const thing of things) {
        thing.addEventListener('mousemove', reposition);
        thing.addEventListener('mouseout', hide);
    }
    tip = document.createElement('p');
    tip.id = 'tinytooltip';
    document.body.append(tip);
    hide();
}
export function setTooltip(elem) {
    elem.addEventListener('mousemove', reposition);
    elem.addEventListener('mouseout', hide);
    tip = document.createElement('p');
    tip.id = 'tinytooltip';
    document.body.append(tip);
    hide();
}
