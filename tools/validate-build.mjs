import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2] || '.');
const walk = d => fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk(root), html=files.filter(f=>f.endsWith('.html'));
const failures=[];
for(const file of html){
 const text=fs.readFileSync(file,'utf8');
 for(const m of text.matchAll(/(?:href|src)=["']([^"'#?]+)(?:#[^"']*)?["']/g)){
  const ref=m[1]; if(/^(?:https?:|mailto:|tel:|data:|javascript:)/.test(ref)) continue;
  const target=path.resolve(path.dirname(file),ref);
  if(!fs.existsSync(target)) failures.push(`${path.relative(root,file)} -> ${ref}`);
 }
}
for(const name of ['data/trip.json','data/navigation.json','data/build-info.json']) JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
for(const m of sw.matchAll(/["'](\.\/[^"']+)["']/g)) if(!fs.existsSync(path.join(root,m[1].slice(2)))) failures.push(`service-worker missing ${m[1]}`);
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log(`PASS: ${html.length} HTML pages; internal files, JSON, and service-worker cache verified.`);
