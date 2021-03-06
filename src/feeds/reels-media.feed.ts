import { Feed } from '../core/feed';
import { ReelsMediaFeedResponse, ReelsMediaFeedResponseItem, ReelsMediaFeedResponseRootObject } from '../responses';
import { IgAppModule } from '../types/common.types';
import * as SUPPORTED_CAPABILITIES from '../samples/supported-capabilities.json';

export class ReelsMediaFeed extends Feed<ReelsMediaFeedResponseRootObject, ReelsMediaFeedResponseItem> {
  userIds: Array<number | string>;
  source: IgAppModule = 'feed_timeline';

  protected set state(data: any) {}

  async request() {
    const { data } = await this.client.request.send<ReelsMediaFeedResponseRootObject>({
      url: `/api/v1/feed/reels_media/`,
      method: 'POST',
      form: this.client.request.sign({
        user_ids: this.userIds,
        source: this.source,
        _uuid: this.client.state.uuid,
        _uid: this.client.state.cookieUserId,
        _csrftoken: this.client.state.cookieCsrfToken,
        device_id: this.client.state.deviceId,
        supported_capabilities_new: JSON.stringify(SUPPORTED_CAPABILITIES),
      }),
    });
    return data;
  }

  async items(): Promise<ReelsMediaFeedResponseItem[]> {
    const data = await this.request();
    return Object.values(data.reels).reduce(
      (accumulator, current: ReelsMediaFeedResponse) => accumulator.concat(current.items),
      [],
    );
  }
}
