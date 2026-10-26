import type { Project } from '../model/types';
/** IndexedDB persistence; no network or remote upload. */
export class ProjectStore {
  private readonly databaseName = 'wiring-ui-projects-v1';
  public async save(project: Project): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve,reject)=>{
      const transaction = db.transaction('projects','readwrite');
      transaction.objectStore('projects').put(structuredClone(project),'last');
      transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);
    }); db.close();
  }
  public async load(): Promise<Project | null> {
    const db = await this.open();
    const value = await new Promise<unknown>((resolve,reject)=>{
      const request=db.transaction('projects','readonly').objectStore('projects').get('last');
      request.onsuccess=()=>resolve(request.result as unknown);request.onerror=()=>reject(request.error);
    }); db.close();
    return this.isProject(value)?value:null;
  }
  private isProject(value: unknown): value is Project {
    if (typeof value!=='object' || value===null) return false;
    return 'version' in value && value.version===1 && 'components' in value && Array.isArray(value.components);
  }
  private open(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve,reject)=>{
      const request=indexedDB.open(this.databaseName,1);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('projects'))db.createObjectStore('projects');};
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
  }
}
