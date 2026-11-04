import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accessStatus} from '../lib/auth.js';
test('production fails closed and password protects requests',()=>{
 const old=process.env.NODE_ENV,pass=process.env.STUDIO_PASSWORD;
 try{process.env.NODE_ENV='production';delete process.env.STUDIO_PASSWORD;assert.equal(accessStatus(new Request('https://studio.example')),503);process.env.STUDIO_PASSWORD='test-password';assert.equal(accessStatus(new Request('https://studio.example')),401);assert.equal(accessStatus(new Request('https://studio.example',{headers:{authorization:`Basic ${btoa('koga:test-password')}`}})),200);}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;if(pass===undefined)delete process.env.STUDIO_PASSWORD;else process.env.STUDIO_PASSWORD=pass;}
});
