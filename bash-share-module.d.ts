declare module "bash-share-module" {
  interface BashShareModuleType {
    ping(): Promise<string>;
    consumePendingShare(): Promise<string | null>;
    notifyShareReceived(json: string): void;
    addListener(eventName: string): void;
    removeListeners(count: number): void;
  }

  const BashShareModule: BashShareModuleType;
  export default BashShareModule;
}