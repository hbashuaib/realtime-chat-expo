// src/core/api.js
import axios from 'axios';
import { Platform } from 'react-native';

const LOCAL_IP = '192.168.8.206'; // your LAN IP

// crude check: emulator devices often have "sdk" or "emulator" in model name
function isEmulator() {
  return /sdk|emulator/i.test(Platform.constants?.Model || '');
}

// Address should NOT include :8000 when using HTTPS through Nginx
export const ADDRESS =
  Platform.OS === 'android'
    ? (isEmulator() ? '10.0.2.2' : LOCAL_IP)
    : Platform.OS === 'ios'
      ? 'localhost'
      : LOCAL_IP;

const api = axios.create({
  baseURL: 'https://' + ADDRESS,   // Nginx listens on 443
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;



// // src/core/api.js
// import axios from 'axios';
// import { Platform } from 'react-native';

// const LOCAL_IP = '192.168.8.206'; // your LAN IP

// // crude check: emulator devices often have "sdk" or "emulator" in model name
// function isEmulator() {
//   return /sdk|emulator/i.test(Platform.constants?.Model || '');
// }

// export const ADDRESS =
//   Platform.OS === 'android'
//     ? (isEmulator() ? '10.0.2.2:8000' : `${LOCAL_IP}:8000`)
//     : Platform.OS === 'ios'
//       ? 'localhost:8000'
//       : `${LOCAL_IP}:8000`;


// const api = axios.create({
//     baseURL: 'https://' + ADDRESS,
//     headers: {
//         'Content-Type': 'application/json'
//     }    
// })

// export default api
