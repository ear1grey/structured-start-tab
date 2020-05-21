// default options - these are reverted to
// if there are no options in the browser's sync store.

// eslint-disable-next-line import/prefer-default-export
export const OPTS = {
  showBookmarksSidebar: false,
  showBookmarksLimit: 0,
  sourceFile: 'file://home/rjb/.sst.json',
  separator: ' - ',
  configJSON:
    {
      name: 'Example',
      links: [
        {
          name: 'One',
          links: [
            {
              name: 'Example A',
              href: 'https://example.org/',
            },
            {
              name: 'Example B',
              href: 'https://example.org/',
            },
            {
              name: 'Three',
              href: '',
            },
          ],
        },
        {
          name: 'Blah',
          links: [
            {
              name: 'local:8080',
              href: 'http://localhost:8080/',
            },
            {
              name: 'local:8000',
              href: 'http://localhost:8000/',
            },
          ],
        },
      ],
    },
};
