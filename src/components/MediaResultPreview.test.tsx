import React from 'react';import test from 'node:test';import assert from 'node:assert/strict';import {renderToStaticMarkup} from 'react-dom/server';
import MediaResultPreview from './MediaResultPreview';import type {MediaJob} from '../services/mediaJobService';
const job={id:'preview-test',kind:'avatar',status:'succeeded',result:{url:'https://example.com/result',type:'video'},summary:'Test'} as MediaJob;
test('avatar and video previews have native playback controls and a return button',()=>{
 const html=renderToStaticMarkup(<MediaResultPreview job={job} onClose={()=>{}}/>);
 assert.match(html,/<video[^>]*controls=""/);assert.match(html,/Close — back to generations/);assert.match(html,/<dialog[^>]*aria-label="Generation preview"/);assert.doesNotMatch(html,/target="_blank"/);
});
test('an image result uses an image inside the same dismissible preview',()=>{
 const html=renderToStaticMarkup(<MediaResultPreview job={{...job,kind:'image',result:{url:'data:image/png;base64,AQID',type:'image'}}} onClose={()=>{}}/>);
 assert.match(html,/<img[^>]*alt="Generated result"/);assert.doesNotMatch(html,/<video/);assert.match(html,/Close — back to generations/);
 assert.equal(renderToStaticMarkup(<MediaResultPreview job={null} onClose={()=>{}}/>),'');
});
