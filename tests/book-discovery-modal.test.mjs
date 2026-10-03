import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import * as catalog from '../src/book-discovery.js';

const source=fs.readFileSync(new URL('../src/book-discovery-modal.js',import.meta.url),'utf8');
const feed='<feed xmlns="http://www.w3.org/2005/Atom"><entry><link rel="http://opds-spec.org/acquisition" type="application/epub+zip" href="/ebooks/11.epub3.images"/></entry></feed>';
function setup(requestUrl) {
  const files=[];
  const app={vault:{getFiles:()=>files}};
  const library={_importBooks:async incoming=>{ files.push({name:incoming[0].name}); return 1; }};
  const Modal=class {constructor(app){this.app=app;}};
  const C=vm.runInNewContext(source.replace(/^import .*;\n/gm,'').replace('export class','class')+'\nBookDiscoveryModal',{
    ...catalog,Modal,requestUrl,DOMParser:new JSDOM('').window.DOMParser,console:{warn(){}},Set
  });
  const modal=new C(app,library,key=>key); modal.isOpen=true;
  const button={disabled:false,setText(value){this.text=value;}};
  const status={setText(value){this.text=value;}};
  return {modal,button,status,files,library};
}
function response(url) {
  if (url.endsWith('.opds')) return {status:200,text:feed};
  const data=new Uint8Array(128);data.set([80,75,3,4]);
  return {status:200,arrayBuffer:data.buffer};
}
test('successful download imports once and stays marked as added',async()=>{
  const x=setup(async({url})=>response(url));
  await x.modal.download({id:'11',title:'Alice'},x.button,x.status);
  assert.equal(x.files.length,1);
  assert.equal(x.button.text,'book-import-finished');
  assert.equal(x.button.disabled,true);
  await x.modal.download({id:'11',title:'Alice'},x.button,x.status);
  assert.equal(x.files.length,1);
});
test('failed import allows retry instead of claiming success',async()=>{
  const x=setup(async({url})=>response(url));x.library._importBooks=async()=>0;
  await x.modal.download({id:'11',title:'Alice'},x.button,x.status);
  assert.equal(x.status.text,'book-download-failed');
  assert.equal(x.button.disabled,false);
  assert.equal(x.library._discoveryDownloads.size,0);
});
test('closing during request prevents vault writes',async()=>{
  let resolve;
  const x=setup(()=>new Promise(r=>{resolve=r;}));
  const job=x.modal.download({id:'11',title:'Alice'},x.button,x.status);
  x.modal.isOpen=false;resolve(response('11.opds'));await job;
  assert.equal(x.files.length,0);
  assert.equal(x.library._discoveryDownloads.size,0);
});
test('concurrent attempts share a download lock',async()=>{
  let resolve;let calls=0;
  const x=setup(({url})=>{calls++;return calls===1?new Promise(r=>{resolve=r;}):Promise.resolve(response(url));});
  const first=x.modal.download({id:'11',title:'Alice'},x.button,x.status);
  await x.modal.download({id:'11',title:'Alice'},{disabled:false,setText(){}},x.status);
  assert.equal(calls,1);resolve(response('11.opds'));await first;
  assert.equal(x.files.length,1);
});
test('older search responses cannot replace the current results',async()=>{
  const pending=[];
  const x=setup(()=>new Promise(resolve=>pending.push(resolve)));
  let clears=0;
  const results={empty(){clears++;},createDiv(){throw new Error('Unexpected stale result');}};
  const first=x.modal.search('Alice',x.status,results);
  const second=x.modal.search('Carroll',x.status,results);
  pending[1]({status:200,text:'<feed xmlns="http://www.w3.org/2005/Atom"/>'});await second;
  assert.equal(x.status.text,'no-books-found');
  pending[0]({status:500});await first;
  assert.equal(x.status.text,'no-books-found');
  assert.equal(clears,2);
});
