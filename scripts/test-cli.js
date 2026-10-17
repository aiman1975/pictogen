// Runs cli.js as a user would and checks its flags: -h as height vs help, input validation, output.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../cli.js', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'pictogen-cli-'));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' });

let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: ${msg}`); if (!ok) fails++; };

try {
  let r = run('a boy', '-h', '400', '-w', '500', '-o', 'h.svg');
  check(r.status === 0 && /viewBox="0 0 500 400"/.test(readFileSync(join(dir, 'h.svg'), 'utf8')), '-h <num> sets the height');

  r = run('-h');
  check(r.status === 0 && r.stdout.includes('Usage:'), '-h alone prints help');
  check(run('--help').stdout.includes('Usage:'), '--help prints help');
  check(run().stdout.includes('Usage:'), 'no arguments prints help');

  r = run('a boy', '-w', 'abc');
  check(r.status === 1 && /width/.test(r.stderr), 'non-numeric width is rejected');
  r = run('a boy', '-s', 'bogus');
  check(r.status === 1 && /unknown style/.test(r.stderr), 'unknown style is rejected');
  r = run('a boy', '-m', 'bogus');
  check(r.status === 1 && /unknown mode/.test(r.stderr), 'unknown mode is rejected');

  check(run('a cat', '-s', 'alphabet', '-o', 'a.svg').status === 0, 'style alias "alphabet" is accepted');
  r = run('a dog and no cats', '-o', 'n.svg');
  check(r.stdout.includes('Left out: cats'), 'negated concepts are reported');

  r = run('3 dogs', '-m', 'icons', '-s', 'cartoon', '-o', 'dogs.svg');
  check(r.status === 0 && r.stdout.includes('dog ×3'), 'prompt with a numeral reports the count');
  check(readFileSync(join(dir, 'dogs.svg'), 'utf8').startsWith('<svg'), 'writes the SVG to -o');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(fails ? `\n${fails} CLI check(s) failed` : '\nCLI test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
