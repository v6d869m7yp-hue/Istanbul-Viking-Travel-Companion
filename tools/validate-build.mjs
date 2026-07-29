import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const walk = d => fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk(root), html=files.filter(f=>f.endsWith('.html'));
const failures=[];

for(const file of html){
  const text=fs.readFileSync(file,'utf8');
  for(const m of text.matchAll(/(?:href|src)=["']([^"'#?]+)(?:#[^"']*)?["']/g)){
    const ref=m[1];
    if(/^(?:https?:|mailto:|tel:|data:|javascript:)/.test(ref)) continue;
    const target=path.resolve(path.dirname(file),ref);
    if(!fs.existsSync(target)) failures.push(`${path.relative(root,file)} -> ${ref}`);
  }
}

for(const name of ['data/trip.json','data/navigation.json','data/build-info.json','data/project-health.json']){
  JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
}

const required=[
  'VERSION.txt','package.json','service-worker.js','RELEASE-v6.8.2.txt',
  'docs/PROJECT-ROADMAP.md','docs/REGRESSION-CHECKLIST.md','docs/RELEASE-PROCESS.md','docs/DEVELOPER-GUIDE.md'
];
for(const name of required) if(!fs.existsSync(path.join(root,name))) failures.push(`required file missing: ${name}`);

const version=fs.readFileSync(path.join(root,'VERSION.txt'),'utf8').trim();
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const build=JSON.parse(fs.readFileSync(path.join(root,'data/build-info.json'),'utf8'));
const trip=JSON.parse(fs.readFileSync(path.join(root,'data/trip.json'),'utf8'));
const health=JSON.parse(fs.readFileSync(path.join(root,'data/project-health.json'),'utf8'));
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const app=fs.readFileSync(path.join(root,'assets/js/app.js'),'utf8');

for(const [label,value] of [['package.json',pkg.version],['build-info',build.version],['trip.json',trip.version],['project-health',health.release]]){
  if(String(value)!==version) failures.push(`version mismatch: VERSION.txt=${version}, ${label}=${value}`);
}
if(!sw.includes(`const VERSION='${version}'`)) failures.push('service-worker VERSION does not match VERSION.txt');
if(!sw.includes(`const BUILD_ID='${build.buildId}'`)) failures.push('service-worker BUILD_ID does not match build-info.json');
if(!sw.includes(`const CACHE='${build.cacheName}'`)) failures.push('service-worker CACHE does not match build-info.json');
if(!app.includes(`const APP_RELEASE={version:'${version}',buildId:'${build.buildId}'}`)) failures.push('APP_RELEASE does not match build-info.json');

for(const file of html){
  const text=fs.readFileSync(file,'utf8');
  for(const m of text.matchAll(/[?&]v=([0-9]+\.[0-9]+\.[0-9]+)/g)){
    if(m[1]!==version) failures.push(`asset version mismatch: ${path.relative(root,file)} uses v=${m[1]}`);
  }
}

for(const m of sw.matchAll(/["'](\.\/[^"']+)["']/g)){
  if(!fs.existsSync(path.join(root,m[1].slice(2)))) failures.push(`service-worker missing ${m[1]}`);
}

if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log(`PASS: ${html.length} HTML pages; links, JSON, JavaScript metadata, release identifiers, and service-worker cache verified for v${version}.`);
