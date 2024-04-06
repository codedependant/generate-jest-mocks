# generate-jest-mocks

Automatically generate Jest mocks for your Javascript/Typescript files based on module usage.

## Example

Consider the following file:

```js
const api = require('api');
const track = require('track');
const { flush } = require('cache');

function main(user) {
  const userID = api.users.create(user);
  track('create_user', userID);
  flush(userID);
}
```

Running `generate-jest-mocks` on it will result in the following manual Jest mocks being generated:

```js
jest.mock('api', () => ({
  users: {
    create: jest.fn(),
  }
});
jest.mock('track', () => jest.fn());
jest.mock('cache', () => ({ flush: jest.fn() }));

```

Or alternatively, when using `--automock`, Jest automocks can be generated:

```js
jest.mock('api');
jest.mock('track');
jest.mock('cache');
```

It also handles ES6 and Typescript files:

```ts
import cache, {set} from 'cache';

set('foo', 'bar');
cache.flush();
}
```

will output:

```js
jest.mock('cache', () => ({
  default: {
    flush: jest.fn(),
  },
  set: jest.fn(),
}));
```

## Install

Install it using npm:

```bash
npm install -g generate-jest-mocks
```

## Usage

```bash
generate-jest-mocks path/to/input.js
```

## Options

### Generate Automocks

By default `generate-jest-mocks` will output manual mocks. To generate automocks use `--automock` or `-a`.

## Include modules

By default a mock will be generated for each imported module. To specify specific modules to be mocked use `--include=module` or `-i=module`. Example:

```
generate-jest-mocks --include=api -i=cache path/to/input.js
```

### Exclude modules

To exclude one or more modules from being mocked use `--exclude=module` or `-e=module`. Example:

```
generate-jest-mocks --exclude=api -e=cache path/to/input.js
```

## Programming API

Import and call the default function:

```js
const generate = require('generate-jest-mocks').default;

const output = generate(fs.readFileSync('path/to/file.js'), {
  automock: false,
  exclude: ['exclude/module'],
  include: ['include/module'],
});
```

or with ES6 simply:

```ts
import generate from 'generate-jest-mocks';
```

## How to Contribute

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Write your code
4. Write tests that cover your code as much as possible
5. Run all tests and ensure they pass
6. Submit a pull request

Please try to keep your pull request small and focused. This will make it much easier to review and accept.
