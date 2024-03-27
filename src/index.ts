import generate from './generate';
import { readFileSync } from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

function main() {
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
    .parseSync();

  const file = argv._[0] ? readFileSync(argv._[0], 'utf-8') : undefined;

  const output = generate(file, {
    exclude: [argv.e].filter(Boolean).flat() as string[],
    include: [argv.i].filter(Boolean).flat() as string[],
  });
  console.log(output);
}

main();
