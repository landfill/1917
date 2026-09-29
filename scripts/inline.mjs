// 빌드 결과를 하나의 HTML 파일로 합친다.
//  - dist/1917.html          : 더블클릭으로 바로 열 수 있는 단일 파일
//  - dist/artifact.html      : <html>/<head>/<body> 껍데기 없이 내용만 담은 버전 (호스팅용)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
let html = readFileSync(join(dist, 'index.html'), 'utf8');
const assets = readdirSync(join(dist, 'assets'));

html = html.replace(/<script type="module" crossorigin src="\.\/assets\/[^"]+"><\/script>/, '');
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/assets\/([^"]+)">/, (_, f) => {
  const css = readFileSync(join(dist, 'assets', f), 'utf8');
  return `<style>${css}</style>`;
});
const jsFile = assets.find((f) => f.endsWith('.js'));
const js = readFileSync(join(dist, 'assets', jsFile), 'utf8').replace(/<\/script/g, '<\\/script');
// 모듈 스크립트는 DOM 뒤에 둔다
html = html.replace('</body>', `<script type="module">${js}</script>\n</body>`);
writeFileSync(join(dist, '1917.html'), html);

const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
writeFileSync(join(dist, 'artifact.html'), `${title}\n${style}\n${body}`);
console.log('single-file build: dist/1917.html, dist/artifact.html');
