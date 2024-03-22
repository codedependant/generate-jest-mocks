import generate from './generate';
import { parse } from '@babel/parser';
import babelGenerate from '@babel/generator';

const f = (string) =>
  babelGenerate(parse(string, { sourceType: 'module' })).code;

describe('generate', () => {
  it('handles object properties', () => {
    const result = generate(`
      const cache = require('cache');
      cache.set('foo', 'bar');
    `);

    expect(result).toBe(f(`jest.mock('cache', () => ({set: jest.fn()}));`));
  });

  it('handles parse error', () => {
    expect(() => generate(`const cache; = require('cache');`)).toThrow(
      'Error parsing file: Missing initializer in const declaration. (1:11)'
    );
  });

  it('handles spread properties', () => {
    const result = generate(`
      const {set} = require('cache');
      set('foo', 'bar');
    `);

    expect(result).toBe(f(`jest.mock('cache', () => ({set: jest.fn()}));`));
  });

  it('handles es6 spread properties', () => {
    const result = generate(`
      import {set} from 'cache';
      set('foo', 'bar');
    `);

    expect(result).toBe(f(`jest.mock('cache', () => ({set: jest.fn()}));`));
  });

  it('handles es6 spread properties and default', () => {
    const result = generate(`
      import cache, {set} from 'cache';
      set('foo', 'bar');
      cache.flush();
    `);

    expect(result).toBe(
      f(
        `jest.mock('cache', () => ({default: {flush: jest.fn()}, set: jest.fn()}));`
      )
    );
  });

  it('handles nested properties', () => {
    const result = generate(`
      const api = require('api');
      api.users.create();
      api.users.delete();
      api.post.create();
      api.post.comments.create();
      api.version();
    `);

    expect(result).toBe(
      f(
        `jest.mock('api', () => ({
          users: {
            create: jest.fn(),
            delete: jest.fn()
          },
          post: {
            create: jest.fn(),
            comments: {
              create: jest.fn()
            }
          },
          version: jest.fn()
      }));`
      )
    );
  });

  it('handles commonjs default functions', () => {
    const result = generate(`
      const track = require('track');
      track('event');
    `);

    expect(result).toBe(f(`jest.mock('track', () => jest.fn());`));
  });

  it('handles es6 default functions', () => {
    const result = generate(`
      import track from 'track';
      track('event');
    `);

    expect(result).toBe(f(`jest.mock('track', () => ({default: jest.fn()}));`));
  });

  it('handles calls in methods', () => {
    const result = generate(`
      const cache = require('cache');
      function main() {
        cache.set('foo', 'bar');
      }
    `);

    expect(result).toBe(f(`jest.mock('cache', () => ({set: jest.fn()}));`));
  });

  it('handles calls in nested methods', () => {
    const result = generate(`
      const cache = require('cache');
      function main() {
        function nested() {
          cache.set('foo', 'bar');
        }
      }
    `);

    expect(result).toBe(f(`jest.mock('cache', () => ({set: jest.fn()}));`));
  });

  it('handles require without assignment', () => {
    const result = generate(`
      require('cache');
    `);

    expect(result).toBe('');
  });

  it('handles import without assignment', () => {
    const result = generate(`
      import 'cache';
    `);

    expect(result).toBe('');
  });
});
