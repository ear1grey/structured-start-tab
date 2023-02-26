import { setFavicon, rgbaToHex, newUuid } from '../lib/util.js';

const findIdent = (element) => {
  if (element.getAttribute('ident')) {
    const ident = element.getAttribute('ident');
    if (ident !== 'undefined') { return ident; }
  }
  return newUuid();
};

// Ids of elements that we don't want parsed
const domToJson = (parentElement) => {
  const jsonContent = [];

  for (const child of parentElement.children) {
    switch (child.tagName) {
      case 'SECTION': // Legacy

        // Keep agendas and trash as normal sections until migrated to their own component
        // Migrate normal panels to sst-panel

        jsonContent.push(
          {
            ident: findIdent(child),
            id: child.id,
            type: (child.id.includes('trash')) ? 'section' : 'sst-panel',
            backgroundColour: child.style.backgroundColor?.includes('rgba') ? rgbaToHex(child.style.backgroundColor) : child.style.backgroundColor,
            textColour: child.style.color,
            direction: child.classList.contains('vertical') ? 'vertical' : 'horizontal',
            singleLineDisplay: !!child.classList.contains('flex-disabled'),
            private: !!child.classList.contains('private'),
            header: child.firstElementChild.textContent, // First element is the h1 element
            content: domToJson(child.children[1]), // Second element is the nav element
            folded: !!child.classList.contains('folded'),
            grow: child.style.flexGrow,
            padding: child.style.padding.replace(/[^0-9.]/g, ''),
            borderSize: child.style.borderWidth.replace(/[^0-9.]/g, ''),
            fontSize: child.style.fontSize.replace(/[^0-9.]/g, ''),
            borderColour: child.style.borderColor,
          });
        break;
      case 'SST-PANEL':
        jsonContent.push(
          {
            ident: findIdent(child),
            id: child.id,
            type: 'sst-panel',
            backgroundColour: child.backgroundColour,
            textColour: child.textColour,
            direction: child.direction,
            singleLineDisplay: child.singleLineDisplay,
            private: child.private,
            header: child.header,
            textMode: child.style.whiteSpace === 'pre-wrap' ? 'multi' : 'single',
            content: domToJson(child.content),
            folded: child.folded,
            grow: child.grow,
            padding: child.padding,
            borderSize: child.borderSize,
            fontSize: child.fontSize,
            borderColour: child.borderColour,
          });
        break;
      case 'A':
        jsonContent.push(
          {
            ident: findIdent(child),
            type: 'link',
            backgroundColour: child.style.backgroundColor,
            textColour: child.style.color,
            name: child.textContent,
            textMode: child.style.whiteSpace === 'pre-wrap' ? 'multi' : 'single',
            url: child.href,
            fontSize: child.style.fontSize.replace(/[^0-9.]/g, ''),
            iconSize: child.querySelector('.favicon')?.style.width.replace(/[^0-9.]/g, ''),
          });
        break;
      case 'P':
        jsonContent.push(
          {
            ident: findIdent(child),
            type: 'text',
            content: child.innerHTML,
          });
        break;
      case 'UL':
        jsonContent.push(
          {
            ident: findIdent(child),
            type: 'list',
            content: domToJson(child),
          });
        break;
      case 'LI':
        jsonContent.push(
          {
            ident: findIdent(child),
            type: 'listItem',
            content: child.innerHTML,
          });
        break;
      default:
        break;
    }
  }

  return jsonContent;
};

const domToJsonSingle = (element) => {
  return domToJson({ children: [element] })[0];
};

const jsonElementToDom = (element, newId = false) => {
  switch (element.type) {
    case 'section': {
      const section = document.createElement('section');

      // Set defaults
      section.setAttribute('draggable', true);

      // Add properties
      section.id = element.id;
      section.setAttribute('ident', newId ? newUuid() : element.ident);
      section.style.backgroundColor = element.backgroundColour?.includes('rgba') ? rgbaToHex(element.backgroundColour) : element.backgroundColour;
      section.style.color = element.textColour;
      section.style.flexGrow = element.grow;
      if (element.direction === 'vertical') { section.classList.add('vertical'); }
      if (element.singleLineDisplay) { section.classList.add('flex-disabled'); }
      if (element.private) { section.classList.add('private'); }
      if (element.folded) { section.classList.add('folded'); }
      if (element.invisible) { section.classList.add('invisible'); }

      // Set header
      const header = document.createElement('h1');
      header.textContent = element.header;
      section.appendChild(header);

      // Set content
      const nav = document.createElement('nav');
      for (const innerElement of element.content) {
        const domInnerElement = jsonElementToDom(innerElement, newId);
        nav.appendChild(domInnerElement);
      }
      section.appendChild(nav);

      return section;
    }
    case 'sst-panel': {
      const panel = document.createElement('sst-panel');

      // Set defaults
      panel.setAttribute('draggable', true);

      // Add properties
      panel.id = element.id;
      panel.setAttribute('ident', newId ? newUuid() : element.ident);
      panel.backgroundColour = element.backgroundColour;
      panel.textColour = element.textColour;
      panel.direction = element.direction;
      panel.singleLineDisplay = element.singleLineDisplay;
      panel.private = element.private;
      panel.header = element.header;
      panel.folded = element.folded;
      panel.grow = element.grow;
      panel.padding = element.padding;
      panel.borderSize = element.borderSize;
      panel.borderColour = element.borderColour;
      panel.fontSize = element.fontSize;

      if (element.invisible) { panel.classList.add('invisible'); }
      if (element.textMode === 'multi') { panel.style.whiteSpace = 'pre-wrap'; } else { panel.style.whiteSpace = 'unset'; }

      // Set content
      for (const innerElement of element.content) {
        const domInnerElement = jsonElementToDom(innerElement, newId);
        panel.content.appendChild(domInnerElement);
      }

      return panel;
    }
    case 'link': {
      const link = document.createElement('a');
      // Set defaults
      link.setAttribute('draggable', true);

      link.setAttribute('ident', newId ? newUuid() : element.ident);
      // Add properties
      link.style.backgroundColor = element.backgroundColour;
      link.style.color = element.textColour;
      link.textContent = element.name;
      if (element.textMode === 'multi') { link.style.whiteSpace = 'pre-wrap'; } else { link.style.whiteSpace = 'nowrap'; }
      if (element.url) {
        link.setAttribute('href', element.url);
        setFavicon(link, element.url, element.iconSize);
      }
      link.style.fontSize = element.fontSize + 'em';
      if (link.querySelector('.favicon')) { link.querySelector('.favicon').style.width = element.iconSize + 'rem'; }

      return link;
    }
    case 'text': {
      const text = document.createElement('p');
      text.setAttribute('ident', newId ? newUuid() : element.ident);
      text.innerHTML = element.content;

      return text;
    }
    case 'list': {
      const list = document.createElement('ul');
      list.setAttribute('ident', newId ? newUuid() : element.ident);
      for (const innerElement of element.content) {
        const domInnerElement = jsonElementToDom(innerElement, newId);
        list.appendChild(domInnerElement);
      }

      return list;
    }
    case 'listItem': {
      const listItem = document.createElement('li');
      listItem.setAttribute('ident', newId ? newUuid() : element.ident);
      listItem.innerHTML = element.content;

      return listItem;
    }
  }
};

const jsonToDom = (container, content) => {
  // remove all children
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  for (const element of content) {
    const domElement = jsonElementToDom(element);
    container.appendChild(domElement);
  }
};

const htmlStringToJson = (htmlString) => {
  // NOTE: DOMParser does not work in service workers!
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  return domToJson(doc.body);
};

export {
  domToJson,
  domToJsonSingle,
  htmlStringToJson,

  jsonToDom,
  jsonElementToDom,
};
