import { setFavicon } from '../lib/util.js';

// Ids of elements that we don't want parsed
const domToJson = (parentElement) => {
  const jsonContent = [];

  for (const child of parentElement.children) {
    switch (child.tagName) {
      case 'SECTION': // Legacy
        jsonContent.push(
          {
            id: child.id,
            type: 'section',
            backgroundColour: child.style.backgroundColor,
            textColour: child.style.color,
            direction: child.classList.contains('vertical') ? 'vertical' : 'horizontal',
            singleLineDisplay: !!child.classList.contains('flex-disabled'),
            private: !!child.classList.contains('private'),
            header: child.firstElementChild.textContent, // First element is the h1 element
            content: domToJson(child.childNodes[1]), // Second element is the nav element
            folded: !!child.classList.contains('folded'),
            grow: child.style.flexGrow,
          });
        break;
      case 'SST-PANEL':
        jsonContent.push(
          {
            id: child.id,
            type: 'sst-panel',
            backgroundColour: child.backgroundColour,
            textColour: child.textColour,
            direction: child.direction,
            singleLineDisplay: child.singleLineDisplay,
            private: child.private,
            header: child.header,
            content: domToJson(child.content),
            folded: child.folded,
            grow: child.grow,
          });
        break;
      case 'A':
        jsonContent.push(
          {
            type: 'link',
            backgroundColour: child.style.backgroundColor,
            textColour: child.style.color,
            name: child.textContent,
            url: child.href,
            icon: child.querySelector('img.favicon')?.src,
          });
        break;
      case 'P':
        jsonContent.push(
          {
            type: 'text',
            content: child.innerHTML,
          });
        break;
      case 'UL':
        jsonContent.push(
          {
            type: 'list',
            content: domToJson(child),
          });
        break;
      case 'LI':
        jsonContent.push(
          {
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

const jsonToDom = (parentElement, content) => {
  for (const element of content) {
    switch (element.type) {
      case 'section':{
        const section = document.createElement('section');

        // Add properties
        section.id = element.id;
        section.style.backgroundColor = element.backgroundColour;
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
        jsonToDom(nav, element.content);
        section.appendChild(nav);

        appendItemWithDefaults(parentElement, section);
        break;
      }
      case 'sst-panel':{
        const panel = document.createElement('sst-panel');

        // Add properties
        panel.id = element.id;
        panel.backgroundColour = element.backgroundColour;
        panel.textColour = element.textColour;
        panel.direction = element.direction;
        panel.singleLineDisplay = element.singleLineDisplay;
        panel.private = element.private;
        panel.header = element.header;
        panel.folded = element.folded;
        panel.grow = element.grow;
        if (element.invisible) { panel.classList.add('invisible'); }

        // Set content
        jsonToDom(panel.content, element.content);

        appendItemWithDefaults(parentElement, panel);
        break;
      }
      case 'link':{
        const link = document.createElement('a');

        // Add properties
        link.style.backgroundColor = element.backgroundColour;
        link.style.color = element.textColour;
        link.setAttribute('href', element.url);
        link.textContent = element.name;
        setFavicon(link, element.url);

        appendItemWithDefaults(parentElement, link);
        break;
      }
      case 'text':{
        const text = document.createElement('p');
        text.innerHTML = element.content;

        parentElement.appendChild(text);
        break;
      }
      case 'list':{
        const list = document.createElement('ul');
        jsonToDom(list, element.content);

        parentElement.appendChild(list);
        break;
      }
      case 'listItem':{
        const listItem = document.createElement('li');
        listItem.innerHTML = element.content;

        parentElement.appendChild(listItem);
        break;
      }
    }
  }
};

const htmlStringToJson = (htmlString) => {
  // NOTE: DOMParser does not work in service workers!
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  return domToJson(doc.body);
};

const appendItemWithDefaults = (parent, item) => {
  item.setAttribute('draggable', true);
  parent.appendChild(item);
};

export {
  domToJson,
  htmlStringToJson,

  jsonToDom,
};
