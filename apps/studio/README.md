# Dialogue Branch Studio (`dlb-studio`)

The Vue 3 / Vite front-end for authoring, testing, and serving Dialogue Branch dialogues. It
talks only to the BFF (`apps/bff`), which proxies to the Web Service (`apps/api`).

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

Requires Node.js 20 or later.

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests

Tests use [Vitest](https://vitest.dev/) + [Vue Test Utils](https://test-utils.vuejs.org/) in a
jsdom environment. Spec files live next to the code they cover as `*.spec.js`.

```sh
npm test          # run once
npm run test:watch
```
