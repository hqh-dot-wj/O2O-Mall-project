import JSEncrypt from 'jsencrypt'
import CryptoJS from 'crypto-js'

/**
 * 加密工具类
 * 对应后端 CryptoService
 */
export class Crypto {
    // 后端 RSA 公钥 (默认值，实际应从接口获取)
    private static publicKey = ''

    /**
     * 设置公钥
     */
    static setPublicKey(key: string) {
        this.publicKey = key
    }

    /**
     * 获取公钥
     */
    static getPublicKey() {
        return this.publicKey
    }

    /**
     * 生成随机 AES 密钥 (32字节/256位)
     */
    static generateAesKey() {
        return CryptoJS.lib.WordArray.random(32).toString()
    }

    /**
     * RSA 加密
     * 用于加密 AES 密钥
     */
    static rsaEncrypt(data: string) {
        if (!this.publicKey) {
            console.warn('RSA public key not set')
            return data
        }
        const encryptor = new JSEncrypt()
        encryptor.setPublicKey(this.publicKey)
        // JSEncrypt 默认使用 PKCS1 v1.5 padding
        return encryptor.encrypt(data) || ''
    }

    /**
     * AES 加密 (CBC模式, PKCS7填充)
     * 用于加密请求数据
     */
    static aesEncrypt(data: any, key: string) {
        const jsonStr = JSON.stringify(data)

        // 生成随机 IV (16字节)
        const iv = CryptoJS.lib.WordArray.random(16)

        const cipher = CryptoJS.AES.encrypt(jsonStr, CryptoJS.enc.Utf8.parse(key), {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        })

        // 组合 IV + 密文 (与后端一致)
        // cipher.ciphertext 是 WordArray
        const encrypted = iv.concat(cipher.ciphertext)

        return CryptoJS.enc.Base64.stringify(encrypted)
    }

    /**
     * AES 解密
     * 用于解密响应数据
     */
    static aesDecrypt(encryptedData: string, key: string) {
        // Base64 解码
        const encryptedWords = CryptoJS.enc.Base64.parse(encryptedData)

        // 提取 IV (前16字节)
        const iv = CryptoJS.lib.WordArray.create(
            encryptedWords.words.slice(0, 4), // 4 words = 16 bytes
            16
        )

        // 提取密文 (剩余部分)
        const ciphertext = CryptoJS.lib.WordArray.create(
            encryptedWords.words.slice(4),
            encryptedWords.sigBytes - 16
        )

        // 解密
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext } as any,
            CryptoJS.enc.Utf8.parse(key),
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        )

        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8)
        return JSON.parse(decryptedStr)
    }

    /**
     * 加密请求数据
     * 返回格式: { encryptedKey: string, encryptedData: string }
     */
    static encryptRequest(data: any) {
        if (!this.publicKey) throw new Error('RSA public key not set')

        const aesKey = this.generateAesKey()
        const encryptedData = this.aesEncrypt(data, aesKey)
        const encryptedKey = this.rsaEncrypt(aesKey)

        return {
            encryptedKey,
            encryptedData
        }
    }
}
