// default options - these are reverted to
// if there are no options in the browser's sync store.

export interface Options {
  [index:string]: any,
  storage: string,
  showToast: number,
  showToolTips: boolean,
  lock: boolean,
  proportionalSections: boolean,
  showBookmarksSidebar: boolean,
  hideBookmarksInPage: boolean,
  showBookmarksLimit: number,
  space: number,
  fontsize: number,
  html: string,
}

// eslint-disable-next-line import/prefer-default-export
export const OPTS: Options = {
  storage: 'local',
  showToast: 5,
  showToolTips: true,
  lock: false,
  proportionalSections: true,
  showBookmarksSidebar: false,
  hideBookmarksInPage: true,
  showBookmarksLimit: 20,
  space: 100,
  fontsize: 100,
  html: "<section draggable='true' style='background: #CCCCFFCC; color: black;'><h1>Structured Start Tab</h1><nav><section draggable='true' style='flex-grow: 2; background: white;'><h1>Introduction</h1><nav><p style='padding:1em'>Hello!</p><p style='padding:1em'>You have just installed Structured Start Tab, a tool for organising links so they are easy to find and use whenever a new tab is opened.  You can fill this page with links and they'll be there every time you open a new tab.  If you add sections they will give the page structure.  Links and sections can me moved around by dragging.</p><p style='padding:1em'>At the bottom of the page is a toolbar: on its left are buttons for adding links and sections, these can be clicked or dragged onto the page.  On the right of the toolbar you can open the options page, see what's in the trash, and suggest enhancements (or report problems).</p><p style='padding:1em'>A sidebar of your recent bookmarks can be included in the page via the options button (or pressing Ctrl+B).  Links in the bookmarks sidebar can be dragged into the page and permanently organised like any other link.</p><p style='padding:1em'>Try it now - double click on the 'Example' section to open it and see some pre-organised links.  Next time you open a tab, it should look exactly the same as this one, with the same sections open, and all the same links.</p><p style='padding:1em'>When you've got the hang of it, fold this message away by double clicking on 'Introduction' at the top of this section.  When it's no longer needed, you can drag the whole section to the Trash.</p><p style='padding:1em'>Finally, thanks for using this, I hope it's as useful for you as it is for me.  If you can help make it better with suggestions for features, bug reports, or contributions of code, please do.   If you like it, please rate it on the app-store-thingy so more people might give it a try.</p></nav></section><section style='background: white;' draggable='true'><h1>Summary</h1><nav><ul style='padding:1em; margin-left: 2em;'><li>Open links with a click.</li><li>Edit links and sections with a shift-click.</li><li>Fold sections with a double-click.</li><li>Organise by dragging.</li><li>Undo the last operation with Ctrl+Z.</li><li>Show bookmakrk sidebar with Ctrl+B.</li></ul></nav></section></nav></section><section style='background: #F702;' draggable='true' class='folded'><h1>Example</h1><nav><section style='background: #F007;' draggable='true'><h1>A Section</h1><nav><a href='http://example.org' draggable='true' href='http://example.org'>A Link</a><a href='https://portsoc.github.io/hallmarks/' draggable='true'>Hallmarks</a></nav></section><section draggable='true' style='background: #F707;'><h1>Games</h1><nav><a href='https://portsoc.github.io/snake/' draggable='true'>Snake</a><a href='https://portsoc.github.io/countdown/' draggable='true'>Countdown</a></nav></section><section draggable='true' style='background: #FF07;'><h1>Tech Examples</h1><nav><a href='https://portsoc.github.io/canvascircle/' draggable='true'>Circles</a><a href='https://portsoc.github.io/img-melt/test/logos.html' draggable='true'>Image Melt</a><a href='https://portsoc.github.io/duelosc/' draggable='true'>Duelling Oscillators</a><a href='https://portsoc.github.io/tinytooltip/' draggable='true'>TinyToolTip</a><section draggable='true' style='background: #0F07'><h1>Drag-a-Cat</h1><nav><a href='http://portsoc.github.io/dragacat/' draggable='true'>Drag-a-Cat</a><a href='http://portsoc.github.io/dragacat/playground.html' draggable='true'>Playground</a></nav></section></nav></section><section style='background: #00f7; color: white;' draggable='true'><h1>Utilities</h1><nav><a href='https://portsoc.github.io/wordcount/' draggable='true'>Word Count</a><a href='https://portsoc.github.io/dcalc/' draggable='true'>Degree Calculator</a></nav></section></nav></section><section id='trash' class='invisible'><h1>Trash</h1><nav></nav></section>",
};
