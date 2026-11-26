const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/weekly-letter');
const {due, summary} = globalThis.WeeklyLetter;
const settings = {letterDay:5,letterTime:'17:00'};
const at = (day,hour) => +new Date(2026,10,day,hour);
test('weekly mail arrives once, catches up after sleep and respects a changed schedule', () => {
  const since=at(23,9);
  assert.equal(due(at(27,16),settings,since,[]),null);
  const delivery=due(at(27,17),settings,since,[]);
  assert.equal(delivery.at,at(27,17));
  assert.deepEqual(due(at(30,9),settings,since,[]),delivery);
  assert.equal(due(at(29,17),{...settings,letterDay:6},since,[delivery]),null);
  assert.equal(due(at(30,9),settings,at(29,12),[]),null);
});
test('letter summarizes completion time and next calendar week separately', () => {
  const notes=[{text:'memo',createdAt:at(26,8),events:[
    {title:'Finished',done:true,at:at(10,12),doneAt:at(24,12)},
    {title:'Old',done:true,at:at(5,12)}, {title:'Due',at:at(28,10)},
    {title:'Next',at:at(30,14)}, {title:'Later',at:at(31,14)}]}];
  const letter=summary(notes,at(27,17));
  assert.deepEqual([letter.done,letter.pending,letter.next.title,letter.notes],['Finished','Due','Next',1]);
});
