# Structured Start Tab

A browser extension that replaces the default tab content with a page of organised links.  Works in Google Chrome, Mozilla Firefox and Microsoft Edge.

## Install

* [Chrome Web Store](https://chrome.google.com/webstore/detail/structured-start-tab/pldheaomfiegamcicehmijhaijcocidb)
* [Firefox addons](https://addons.mozilla.org/en-GB/firefox/addon/structured-start-tab/)

## Contribute

* Please add suggestions, feature requests and bug reports to the [issue tracker](https://github.com/ear1grey/structured-start-tab/issues).
* Code contributions are most welcome, please submit a PR.
* Future release plans can be seen in the [open milestones](https://github.com/ear1grey/structured-start-tab/milestones?state=open)

## Versions

* From version 1.8.0 versions are managed by running `npm version <major|minor|patch|beta>`.  This will increment the version number, rebuild the code and assemble a zip for release.  Prior to running `npm version`, the git working director must be clean (with no uncommitted work) and code must lint without error or the build will fail. After versioning, a git push will be necessary to sync the git tag with GitHub - this push step has purposefully not been automated (yet).  
Note that beta versions are composed of 4 numbers (e.g. `1.10.0.1`) whilst live version are composed of only 3 numbers (e.g. `1.10.1`).

## Firebase configuration

A `.firebaserc` with the Firebase project ID needs to present in the root folder of the project (Firebase > Project Settings > General > Project ID).

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

Run emulator:

```sh
firebase emulators:start --import ./firebase_data --export-on-exit --inspect-functions
```

## License

[Mozilla Public License v2](https://www.mozilla.org/en-US/MPL/2.0/)
