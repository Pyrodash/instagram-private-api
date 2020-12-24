import { Expose } from 'class-transformer';
import { Feed } from '../core/feed';
import { DirectInboxFeedResponse, DirectInboxFeedResponseThreadsItem } from '../responses';
import { DirectThreadEntity } from '../entities';

export class DirectPendingInboxFeed extends Feed<DirectInboxFeedResponse, DirectInboxFeedResponseThreadsItem> {
  @Expose()
  private cursor: string;
  @Expose()
  private seqId: number;

  set state(data: DirectInboxFeedResponse) {
    this.moreAvailable = data.inbox.has_older;
    this.seqId = data.seq_id;
    this.cursor = data.inbox.oldest_cursor;
  }

  async request() {
    const { data } = await this.client.request.send<DirectInboxFeedResponse>({
      url: `/api/v1/direct_v2/pending_inbox/`,
      qs: {
        visual_message_return_type: 'unseen',
        cursor: this.cursor,
        direction: this.cursor ? 'older' : void 0,
        seq_id: this.seqId,
        thread_message_limit: 10,
        persistentBadging: true,
        limit: 20,
      },
    });
    this.state = data;
    return data;
  }

  async items() {
    const response = await this.request();
    return response.inbox.threads;
  }

  async records(): Promise<DirectThreadEntity[]> {
    const threads = await this.items();
    return threads.map(thread => this.client.entity.directThread(thread.thread_id));
  }
}
