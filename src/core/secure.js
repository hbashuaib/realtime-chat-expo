// src/core/secure.js
import * as SecureStore from 'expo-secure-store'
import utils from './utils';

async function set(key, object) {
    try {
        utils.log('Secure Set Credentials: ', key, JSON.stringify(object))
        await SecureStore.setItemAsync(key, JSON.stringify(object))
    } catch (error) {
        console.log('secure.set:', error)
    }
}

async function get(key) {
    try {
        const data = await SecureStore.getItemAsync(key)
        if (data !== null) {
            return JSON.parse(data)
        }
    } catch (error) {
        console.log('secure.get:', error)
    }
}

async function remove(key) {
    try {
        await SecureStore.deleteItemAsync(key)
    } catch (error) {
        console.log('secure.remove:', error)
    }
}

async function wipe() {
    try {
        console.warn('SecureStore does not support clearing all keys at once.');
        // You can manually remove known keys here if needed:
        // await remove('user');
        // await remove('token');
    } catch (error) {
        console.log('secure.wipe:', error)
    }
}

export default { set, get, remove, wipe }