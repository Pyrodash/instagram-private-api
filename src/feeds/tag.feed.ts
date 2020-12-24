import { Expose } from 'class-transformer';
import { Feed } from '../core/feed';
import { TagFeedResponse, TagFeedResponseItemsItem } from '../responses';

export class TagFeed extends Feed<TagFeedResponse, TagFeedResponseItemsItem> {
  tag: string;
  @Expose()
  private nextMaxId: string;

  set state(data: TagFeedResponse) {
    this.moreAvailable = data.more_available;
    this.nextMaxId = data.next_max_id;
  }

  async request() {
    const { data } = await this.client.request.send<TagFeedResponse>({
      url: `/api/v1/feed/tag/${encodeURI(this.tag)}/`,
      qs: {
        rank_token: this.rankToken,
        max_id: this.nextMaxId,
      },
    });
    this.state = data;
    return data;
  }

  async items() {
    const response = await this.request();
    return response.items;
  }
}
