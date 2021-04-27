import { Expose } from 'class-transformer';
import { Feed } from '../core/feed';
import { SavedFeedResponseRootObject, SavedFeedResponseMedia } from '../responses';

export class SavedFeed extends Feed<SavedFeedResponseRootObject, SavedFeedResponseMedia> {
  @Expose()
  public nextMaxId: string;

  set state(data: SavedFeedResponseRootObject) {
    this.moreAvailable = data.more_available;
    this.nextMaxId = data.next_max_id;
  }

  async request(): Promise<SavedFeedResponseRootObject> {
    const { data } = await this.client.request.send({
      url: '/api/v1/feed/saved/',
      qs: {
        max_id: this.nextMaxId,
        include_igtv_preview: false,
      },
    });
    this.state = data;
    return data;
  }

  async items(): Promise<SavedFeedResponseMedia[]> {
    const { items } = await this.request();
    return items.map(i => i.media);
  }
}
