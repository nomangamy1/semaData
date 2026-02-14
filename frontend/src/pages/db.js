import Dexie from 'dexie';

export const db = new Dexie('SemaDataDrafts');
db.version(1).stores({
  drafts: '++id, refNum, status, timestamp' // audioBlob will be stored here
}); 


export default db;