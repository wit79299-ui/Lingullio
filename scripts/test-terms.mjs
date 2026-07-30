import fs from 'fs';
const content = fs.readFileSync('src/components/tef/tef-lexique-data.ts', 'utf-8');

// Check what quote style is actually used in the file
const lines = content.split('\n').filter(l => l.includes('term:'));
console.log('Sample term lines:');
lines.slice(0, 10).forEach(l => console.log('  ', l.trim()));

console.log('\n---\n');

// The file uses single quotes but terms with apostrophes use escaped \'
// OR the file uses double quotes for those terms
// Let's use a broader approach: find term: followed by a string
const termRegex = /term:\s*(['"])(.*?)\1/g;
const terms = [];
let m;
while ((m = termRegex.exec(content)) !== null) {
  terms.push(m[2]);
}
const unique = [...new Set(terms)];
console.log('Total extracted:', terms.length, 'Unique:', unique.length);

// Show terms with apostrophes
const apoTerms = unique.filter(t => t.includes("'") || t.includes('\u2019'));
console.log('\nTerms with apostrophes:', apoTerms.length);
apoTerms.forEach(t => console.log('  ', t));

// Show all unique terms
console.log('\nAll unique terms:');
unique.forEach((t, i) => console.log(`  ${i+1}. "${t}"`));
