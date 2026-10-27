export interface Settings { theme: 'light' | 'dark'; snap: boolean; grid: boolean; inspectorPinned: boolean }
export class SettingsStore {
  private readonly key='wiring-ui-settings';
  public read(): Settings {
    const defaults: Settings={theme:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light',snap:true,grid:true,inspectorPinned:false};
    try {
      const raw=localStorage.getItem(this.key);
      if (!raw) return defaults;
      const loaded=JSON.parse(raw) as Partial<Settings>;
      return {theme:loaded.theme==='dark'?'dark':loaded.theme==='light'?'light':defaults.theme,snap:loaded.snap!==false,grid:loaded.grid!==false,inspectorPinned:loaded.inspectorPinned===true};
    } catch {return defaults;}
  }
  public write(settings: Settings): void {try{localStorage.setItem(this.key,JSON.stringify(settings));}catch{ /* Private mode storage can be unavailable. */ }}
}
