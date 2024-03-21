import generate from './generate';
import { readFileSync } from 'fs';

function main() {
  const file = process.argv[2]
    ? readFileSync(process.argv[2], 'utf-8')
    : undefined;

  const output = generate(file);
  console.log('main : output:', output);
}

main();
