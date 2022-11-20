// Ids of elements that we don't want parsed
const htmlToJson = (parentElement) => {
  const jsonContent = [];

  for (const child of parentElement.children) {
    switch (child.tagName) {
      case 'SECTION':
        jsonContent.push(
          {
            id: child.id,
            type: 'section',
            backgroundColor: child.style.backgroundColor,
            textColour: child.style.color,
            direction: child.classList.contains('vertical') ? 'vertical' : 'horizontal',
            singleLineDisplay: !!child.classList.contains('flex-disabled'),
            private: !!child.classList.contains('private'),
            header: child.firstElementChild.textContent, // First element is the h1 element
            content: htmlToJson(child.childNodes[1]), // Second element is the nav element
            folded: !!child.classList.contains('folded'),
          });
        break;
      case 'A':
        jsonContent.push(
          {
            type: 'link',
            backgroundColor: child.style.backgroundColor,
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
            content: htmlToJson(child),
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

const jsonToHtml = (parentElement, content) => {
  for (const element of content) {
    switch (element.type) {
      case 'section':{
        const section = document.createElement('section');

        // Add properties
        section.id = element.id;
        section.style.backgroundColor = element.backgroundColor;
        section.style.color = element.textColour;
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
        jsonToHtml(nav, element.content);
        section.appendChild(nav);

        appendItemWithDefaults(parentElement, section);
        break;
      }
      case 'link':{
        const link = document.createElement('a');

        // Add properties
        link.style.backgroundColor = element.backgroundColor;
        link.style.color = element.textColour;
        link.setAttribute('href', element.url);
        link.textContent = element.name;

        // Set icon
        const icon = document.createElement('img');
        icon.classList.add('favicon');
        icon.setAttribute('src', element.icon);
        link.appendChild(icon);

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
        jsonToHtml(list, element.content);

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
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  return htmlToJson(doc.body);
};

const appendItemWithDefaults = (parent, item) => {
  item.setAttribute('draggable', true);
  parent.appendChild(item);
};

export {
  htmlToJson,
  htmlStringToJson,

  jsonToHtml,
};
