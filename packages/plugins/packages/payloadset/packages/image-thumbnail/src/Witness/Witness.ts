import { axios, AxiosError, AxiosResponse } from '@xyo-network/axios'
import { PayloadHasher } from '@xyo-network/core'
import { ImageThumbnailErrorPayload, ImageThumbnailPayload, ImageThumbnailSchema } from '@xyo-network/image-thumbnail-payload-plugin'
import { isPayload, ModuleErrorSchema, Payload } from '@xyo-network/payload-model'
import { UrlPayload } from '@xyo-network/url-payload-plugin'
import { AbstractWitness } from '@xyo-network/witness'
import { subClass } from 'gm'
import { sha256 } from 'hash-wasm'
import compact from 'lodash/compact'
import isBuffer from 'lodash/isBuffer'
import { LRUCache } from 'lru-cache'
import shajs from 'sha.js'

import { ImageThumbnailWitnessConfigSchema } from './Config'
import { ImageThumbnailWitnessParams } from './Params'

const gm = subClass({ imageMagick: '7+' })

export const binaryToSha256 = async (data: Uint8Array) => {
  await PayloadHasher.wasmInitialized
  if (PayloadHasher.wasmSupport.canUseWasm) {
    try {
      return await sha256(data)
    } catch (ex) {
      PayloadHasher.wasmSupport.allowWasm = false
    }
  }
  // eslint-disable-next-line deprecation/deprecation
  return shajs('sha256').update(data).digest().toString()
}

export class ImageThumbnailWitness<TParams extends ImageThumbnailWitnessParams = ImageThumbnailWitnessParams> extends AbstractWitness<TParams> {
  static override configSchemas = [ImageThumbnailWitnessConfigSchema]

  private _cache?: LRUCache<string, ImageThumbnailPayload | ImageThumbnailErrorPayload>

  get cache() {
    this._cache = this._cache ?? new LRUCache<string, ImageThumbnailPayload | ImageThumbnailErrorPayload>({ max: this.maxCacheEntries })
    return this._cache
  }

  get encoding() {
    return this.config.encoding ?? 'PNG'
  }

  get height() {
    return this.config.height ?? 128
  }

  get maxCacheEntries() {
    return this.config.maxCacheEntries ?? 5000
  }

  get quality() {
    return this.config.quality ?? 50
  }

  get width() {
    return this.config.width ?? 128
  }

  protected override async observeHandler(payloads: UrlPayload[] = []): Promise<(ImageThumbnailPayload | ImageThumbnailErrorPayload)[]> {
    const responsePairs = compact(
      await Promise.all(
        payloads.map<Promise<[string, ImageThumbnailPayload | ImageThumbnailErrorPayload | AxiosResponse | Buffer]>>(async ({ url }) => {
          const cachedResult = this.cache.get(url)
          if (cachedResult) {
            return [url, cachedResult]
          }
          //if it is a data URL, return a Buffer
          if (url.startsWith('data:image')) {
            const data = url.split(',')[1]
            if (data) {
              const buffer = Buffer.from(Uint8Array.from(atob(data), (c) => c.charCodeAt(0)))
              console.log(`data buffer: ${buffer.length}`)
              return [url, buffer]
            } else {
              const error: ImageThumbnailErrorPayload = {
                message: 'Invalid data Url',
                schema: ModuleErrorSchema,
                url,
              }
              return [url, error]
            }
          }

          //if it is ipfs, go through cloud flair
          const mutatedUrl = url.replace('ipfs://', 'https://cloudflare-ipfs.com/')
          try {
            return [
              url,
              await axios.get(mutatedUrl, {
                responseType: 'arraybuffer',
              }),
            ]
          } catch (ex) {
            const axiosError = ex as AxiosError
            if (axiosError.isAxiosError) {
              //selectively pick fields from AxiosError
              const errorPayload: ImageThumbnailErrorPayload = {
                code: axiosError.code,
                message: axiosError.message,
                schema: ModuleErrorSchema,
                status: axiosError.status,
                url,
              }
              return [url, errorPayload]
            } else {
              throw ex
            }
          }
        }),
      ),
    )
    return compact(
      await Promise.all(
        responsePairs.map(async ([url, urlResult]) => {
          if (isPayload(urlResult)) {
            this.cache.set(url, urlResult)
            return urlResult
          }

          let sourceBuffer: Buffer

          if (isBuffer(urlResult)) {
            sourceBuffer = urlResult as Buffer
          } else {
            const response = urlResult as AxiosResponse

            if (response.status >= 200 && response.status < 300) {
              sourceBuffer = Buffer.from(response.data, 'binary')
            } else {
              const error: ImageThumbnailErrorPayload = {
                schema: ModuleErrorSchema,
                status: response.status,
                url,
              }
              this.cache.set(url, error)
              return error
            }
          }
          try {
            const thumb = await new Promise<Buffer>((resolve, reject) => {
              gm(sourceBuffer)
                .quality(this.quality)
                .resize(this.width, this.height)
                .flatten()
                .toBuffer(this.encoding, (error, buffer) => {
                  if (error) {
                    reject(error)
                  } else {
                    resolve(buffer)
                  }
                })
            })
            const result: ImageThumbnailPayload = {
              schema: ImageThumbnailSchema,
              sourceHash: await binaryToSha256(sourceBuffer),
              sourceUrl: url,
              url: `data:image/png;base64,${thumb.toString('base64')}`,
            }
            this.cache.set(url, result)
            return result
          } catch (ex) {
            const error: ImageThumbnailErrorPayload = {
              message: 'Failed to resize image',
              schema: ModuleErrorSchema,
              url,
            }
            this.cache.set(url, error)
            return error
          }
        }),
      ),
    )
  }
}
