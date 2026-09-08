import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPlan,planText} from '../planner.js';
const input={title:'Case study',members:['A','B','C'],tasks:[{name:'Research',hours:2},{name:'Compare',hours:2},{name:'Budget',hours:1},{name:'Slides',hours:3},{name:'Rehearse',hours:1}],deadline:'2026-09-15',today:'2026-09-08'};
test('balances a known workload without losing task order and preserves review day',()=>{const p=buildPlan(input);assert.deepEqual(p.tasks.map(t=>t.name),input.tasks.map(t=>t.name));assert.deepEqual(p.members.map(m=>p.tasks.filter(t=>t.owner===m).reduce((s,t)=>s+t.hours,0)),[3,3,3]);assert.equal(p.tasks.at(-1).due,'2026-09-14');});
test('same day deadline stays today',()=>{assert.ok(buildPlan({...input,deadline:input.today}).tasks.every(t=>t.due===input.today));});
test('invalid estimates, duplicates, impossible dates, and past dates fail',()=>{for(const patch of [{members:['A','a']},{tasks:[{name:'x',hours:0}]},{tasks:[{name:'x',hours:Infinity}]},{deadline:'2026-09-07'},{deadline:'2026-02-30'}])assert.throws(()=>buildPlan({...input,...patch}));});
test('export reflects edited owners, dates, and completion',()=>{const p=buildPlan(input);p.tasks[0].owner='C';p.tasks[0].done=true;p.tasks[0].due='2026-09-10';assert.match(planText(p),/\[x\] Research\n   Owner: C.*Due: 2026-09-10/);});
