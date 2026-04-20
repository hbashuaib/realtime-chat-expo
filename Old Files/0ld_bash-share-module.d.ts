declare module "bash-share-module" {
  interface BashShareModuleType {
    ping(): Promise<string>;
    consumePendingShare(): Promise<string | null>;
    peekPendingShare(): Promise<string | null>;   // ✅ add this line
    notifyShareReceived(json: string): void;
    addListener(eventName: string): void;
    removeListeners(count: number): void;
  }

  const BashShareModule: BashShareModuleType;
  export default BashShareModule;
}