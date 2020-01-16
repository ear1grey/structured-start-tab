/**
 * Accept an array of things that are either containers or links
 * inject in the section template
 * use the name
 * stick in the links
 * iff link has links - recurse
 * iff link has no links - inject
 */
export async function buildBookmarks(data, target) {

  if (!target) return;

  const freshdate = Date.now() - 1000 * 60 * 60 * 96;

  for (const x of data) {
    const a = document.createElement('a');
    a.href = x.url;
    a.textContent = x.title;

    if (x.dateAdded > freshdate) {
      a.classList.add('fresh');
    }

    target.appendChild(a);
  }
}

export async function prepareBookmarks(OPTS) {
  if (OPTS.showBookmarksSidebar) {
    const c = JSON.parse(OPTS.showBookmarksLimit);
    const bp = new Promise(((resolve, reject) => {
      chrome.bookmarks.getRecent(c, resolve);
    }));
    buildBookmarks(await bp);
  }
}
