import { defaultsDeep, random } from 'lodash';
import * as CryptoJS from 'crypto-js';
import { Subject } from 'rxjs';
import { AttemptOptions, retry } from '@lifeomic/attempt';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import axiosCookieJarSupportRN from 'axios-cookiejar-support-react-native';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as querystring from 'querystring';
import { Options } from 'request';
import { IgApiClient } from './client';
import {
  IgActionSpamError,
  IgCheckpointError,
  IgClientError,
  IgInactiveUserError,
  IgLoginRequiredError,
  IgNetworkError,
  IgNotFoundError,
  IgPrivateUserError,
  IgResponseError,
  IgSentryBlockError,
  IgUserHasLoggedOutError,
} from '../errors';
import { IgResponse } from '../types';

if (typeof navigator != 'undefined' && navigator.product === 'ReactNative') {
  axiosCookieJarSupportRN(axios);
} else {
  axiosCookieJarSupport(axios);
}

import debug from 'debug';

type Payload = { [key: string]: any } | string;

interface SignedPost {
  signed_body: string;
  ig_sig_key_version: string;
}

export class Request {
  private static requestDebug = debug('ig:request');
  end$ = new Subject();
  error$ = new Subject<IgClientError>();
  attemptOptions: Partial<AttemptOptions<any>> = {
    maxAttempts: 1,
  };
  defaults: Partial<Options> = {};

  constructor(private client: IgApiClient) {}

  /* private static requestTransform(body, response: Response, resolveWithFullResponse) {
    try {
      // Sometimes we have numbers greater than Number.MAX_SAFE_INTEGER in json response
      // To handle it we just wrap numbers with length > 15 it double quotes to get strings instead
      response.body = JSONbigString.parse(body);
    } catch (e) {
      if (inRange(response.statusCode, 200, 299)) {
        throw e;
      }
    }
    return resolveWithFullResponse ? response : response.body;
  } */

  public async send<T = any>(userOptions: Options, onlyCheckHttpStatus?: boolean): Promise<IgResponse<T>> {
    const options = defaultsDeep(
      userOptions,
      {
        //baseURL: 'https://i.instagram.com/',
        proxy: this.client.state.proxyUrl,
        //transformRequest: Request.requestTransform,
        jar: this.client.state.cookieJar,
        headers: this.getDefaultHeaders(),
        method: 'GET',
        withCredentials: true,
      },
      this.defaults,
    );

    options.url = `https://i.instagram.com${options.url}`;

    if (options.form) {
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      options.data = querystring.stringify(options.form);

      options.form = null;
      delete options.form;
    }

    if (options.qs) {
      options.params = options.qs;

      options.qs = null;
      delete options.qs;
    }

    for (const i in options.headers) {
      if (!options.headers[i]) {
        options.headers[i] = null;
        delete options.headers[i];
      }
    }

    Request.requestDebug(`Requesting ${options.method} ${options.url || options.uri || '[could not find url]'}`);
    const response = await this.faultTolerantRequest(options);
    this.updateState(response);
    process.nextTick(() => this.end$.next());
    if (response.data.status === 'ok' || (onlyCheckHttpStatus && response.status === 200)) {
      return response;
    }
    const error = this.handleResponseError(response);
    process.nextTick(() => this.error$.next(error));
    throw error;
  }

  private updateState(response: IgResponse<any>) {
    const {
      'x-ig-set-www-claim': wwwClaim,
      'ig-set-authorization': auth,
      'ig-set-password-encryption-key-id': pwKeyId,
      'ig-set-password-encryption-pub-key': pwPubKey,
    } = response.headers;
    if (typeof wwwClaim === 'string') {
      this.client.state.igWWWClaim = wwwClaim;
    }
    if (typeof auth === 'string' && !auth.endsWith(':')) {
      this.client.state.authorization = auth;
    }
    if (typeof pwKeyId === 'string') {
      this.client.state.passwordEncryptionKeyId = pwKeyId;
    }
    if (typeof pwPubKey === 'string') {
      this.client.state.passwordEncryptionPubKey = pwPubKey;
    }
  }

  public signature(data: string) {
    return CryptoJS.HmacSHA256(data, this.client.state.signatureKey).toString(CryptoJS.enc.Hex);
  }

  public sign(payload: Payload): SignedPost {
    const json = typeof payload === 'object' ? JSON.stringify(payload) : payload;
    const signature = this.signature(json);
    return {
      ig_sig_key_version: this.client.state.signatureVersion,
      signed_body: `${signature}.${json}`,
    };
  }

  public userBreadcrumb(size: number) {
    const term = random(2, 3) * 1000 + size + random(15, 20) * 1000;
    const textChangeEventCount = Math.round(size / random(2, 3)) || 1;
    const data = `${size} ${term} ${textChangeEventCount} ${Date.now()}`;
    const signature = Buffer.from(
      CryptoJS.HmacSHA256(data, this.client.state.userBreadcrumbKey).toString(CryptoJS.enc.Hex),
    ).toString('base64');
    const body = Buffer.from(data).toString('base64');
    return `${signature}\n${body}\n`;
  }

  private handleResponseError(response: AxiosResponse): IgClientError {
    Request.requestDebug(
      `Request ${response.request.method} ${response.request.uri.path} failed: ${
        typeof response.data === 'object' ? JSON.stringify(response.data) : response.data
      }`,
    );

    const json = response.data;
    if (json.spam) {
      return new IgActionSpamError(response);
    }
    if (response.status === 404) {
      return new IgNotFoundError(response);
    }
    if (typeof json.message === 'string') {
      if (json.message === 'challenge_required') {
        this.client.state.checkpoint = json;
        return new IgCheckpointError(response);
      }
      if (json.message === 'user_has_logged_out') {
        return new IgUserHasLoggedOutError(response);
      }
      if (json.message === 'login_required') {
        return new IgLoginRequiredError(response);
      }
      if (json.message.toLowerCase() === 'not authorized to view user') {
        return new IgPrivateUserError(response);
      }
    }
    if (json.error_type === 'sentry_block') {
      return new IgSentryBlockError(response);
    }
    if (json.error_type === 'inactive user') {
      return new IgInactiveUserError(response);
    }
    return new IgResponseError(response);
  }

  protected async faultTolerantRequest(options: AxiosRequestConfig) {
    try {
      const res = await retry(async () => axios(options), this.attemptOptions);
      return res;
    } catch (err) {
      throw new IgNetworkError(err);
    }
  }

  public getDefaultHeaders() {
    return {
      'User-Agent': this.client.state.appUserAgent,
      'X-Ads-Opt-Out': this.client.state.adsOptOut ? '1' : '0',
      // needed? 'X-DEVICE-ID': this.client.state.uuid,
      'X-CM-Bandwidth-KBPS': '-1.000',
      'X-CM-Latency': '-1.000',
      'X-IG-App-Locale': this.client.state.language,
      'X-IG-Device-Locale': this.client.state.language,
      'X-Pigeon-Session-Id': this.client.state.pigeonSessionId,
      'X-Pigeon-Rawclienttime': (Date.now() / 1000).toFixed(3),
      'X-IG-Connection-Speed': `${random(1000, 3700)}kbps`,
      'X-IG-Bandwidth-Speed-KBPS': '-1.000',
      'X-IG-Bandwidth-TotalBytes-B': '0',
      'X-IG-Bandwidth-TotalTime-MS': '0',
      'X-IG-EU-DC-ENABLED':
        typeof this.client.state.euDCEnabled === 'undefined' ? void 0 : this.client.state.euDCEnabled.toString(),
      'X-IG-Extended-CDN-Thumbnail-Cache-Busting-Value': this.client.state.thumbnailCacheBustingValue.toString(),
      'X-Bloks-Version-Id': this.client.state.bloksVersionId,
      'X-MID': this.client.state.extractCookie('mid')?.value,
      'X-IG-WWW-Claim': this.client.state.igWWWClaim || '0',
      'X-Bloks-Is-Layout-RTL': this.client.state.isLayoutRTL.toString(),
      'X-IG-Connection-Type': this.client.state.connectionTypeHeader,
      'X-IG-Capabilities': this.client.state.capabilitiesHeader,
      'X-IG-App-ID': this.client.state.fbAnalyticsApplicationId,
      'X-IG-Device-ID': this.client.state.uuid,
      'X-IG-Android-ID': this.client.state.deviceId,
      'Accept-Language': this.client.state.language.replace('_', '-'),
      'X-FB-HTTP-Engine': 'Liger',
      Authorization: this.client.state.authorization,
      Host: 'i.instagram.com',
      'Accept-Encoding': 'gzip',
      Connection: 'close',
    };
  }
}
