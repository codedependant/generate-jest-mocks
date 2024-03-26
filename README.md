# generate-jest-mocks

Generates Jest mocks for imported modules based on their usage in a provided Javascript/Typescript file. Useful when automocks are slow.

## Example

Consider the following code snippet:

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

Running `generate-jest-mocks` on this code will result in the following Jest mocks being generated:

```js
jest.mock('api', () => ({
  users: {
    create: jest.fn(),
  }
});
jest.mock('track', () => jest.fn());
jest.mock('cache', () => ({flush: jest.fn()}));

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
