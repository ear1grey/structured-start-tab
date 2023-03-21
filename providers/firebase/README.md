# Firebase configuration

A `.firebaserc` with the Firebase project ID needs to present in the root folder of the project (Firebase > Project Settings > General > Project ID).

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

## Firebase requirements

The project requires the following Firebase ***Functions*** and Firebase ***Firestore Database*** to be enabled in the project.

## Commands

### Run emulator

```sh
npm run serve
```

### Deploy functions

```sh
npm run deploy
```
