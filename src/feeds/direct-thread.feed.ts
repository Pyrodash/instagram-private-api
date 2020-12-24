import { Expose } from 'class-transformer';
import { Feed } from '../core/feed';
import { DirectThreadFeedResponse, DirectThreadFeedResponseItemsItem } from '../responses';

export class DirectThreadFeed extends Feed<DirectThreadFeedResponse, DirectThreadFeedResponseItemsItem> {
  public id: string;
  public seqId: number;
  @Expose()
  public cursor: string;
  set state(data: DirectThreadFeedResponse) {
    this.cursor = data.thread.oldest_cursor;
    this.moreAvailable = data.thread.has_older;
  }
  async request() {
    const { data } = await this.client.request.send<DirectThreadFeedResponse>({
      url: `/api/v1/direct_v2/threads/${this.id}/`,
      qs: {
        visual_message_return_type: 'unseen',
        cursor: this.cursor,
        direction: 'older',
        seq_id: this.seqId,
        limit: 10,
      },
    });
    this.state = data;
    return data;
  }

  async items() {
    const response = await this.request();
    return response.thread.items;
  }
}
