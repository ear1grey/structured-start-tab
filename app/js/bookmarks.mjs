const FOUR_DAYS = 1000 * 60 * 60 * 96;

/**
 * Accept an array of things that are either containers or links
 * inject in the section template
 * use the name
 * stick in the links
 * iff link has links - recurse
 * iff link has no links - inject
 */
export function buildBookmarks(data, target) {
  for (const x of data) {
    const a = document.createElement('a');
    a.href = x.url;
    a.textContent = x.title;

    if (x.dateAdded > Date.now() - FOUR_DAYS) {
      a.classList.add('fresh');
    }

    target.appendChild(a);
  }
}

export async function prepareBookmarks(OPTS, target) {
  if (OPTS.showBookmarksSidebar) {
    const c = JSON.parse(OPTS.showBookmarksLimit);
    const bp = new Promise(resolve => {
      chrome.bookmarks.getRecent(c, resolve);
    });
    buildBookmarks(await bp, target);
  }
}
