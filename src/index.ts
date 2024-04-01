#!/usr/bin/env node

import generate from './generate';
import { readFileSync } from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

function main() {
  try {
    const argv = yargs(hideBin(process.argv))
      .option('exclude', {
        alias: 'e',
        type: 'string',
        description: 'List of modules to exclude',
      })
      .option('include', {
        alias: 'i',
        type: 'string',
        description: 'List of modules to include',
      })
      .option('automock', {
        alias: 'a',
        type: 'boolean',
        description: 'Output jest automocks instead of manual mocks',
      })
      .parseSync();

    const file = argv._[0] ? readFileSync(argv._[0], 'utf-8') : undefined;

    const output = generate(file, {
      exclude: [argv.e].filter(Boolean).flat() as string[],
      include: [argv.i].filter(Boolean).flat() as string[],
      automock: argv.a as boolean,
    });
    console.log(output);
  } catch (error) {
    console.error(error.message);
  }
}

main();
