const generate = require('./generate');

function main() {
  const file = process.argv[2]
  ? fs.readFileSync(process.argv[2], 'utf-8')
  : undefined;

  const output = generate(file);
  console.log('main : output:', output)
}

main();