import { NativeModules, NativeEventEmitter } from 'react-native';

const BashShareModule = NativeModules.BashShareModule;
export const BashShareEmitter = new NativeEventEmitter(BashShareModule);
export default BashShareModule;