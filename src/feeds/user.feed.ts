import { Expose } from 'class-transformer';
import { Feed } from '../core/feed';
import { UserFeedResponse, UserFeedResponseItemsItem } from '../responses';

export class UserFeed extends Feed<UserFeedResponse, UserFeedResponseItemsItem> {
  id: number | string;
  @Expose()
  public nextMaxId: string;

  protected set state(data: UserFeedResponse) {
    this.moreAvailable = data.more_available;
    this.nextMaxId = data.next_max_id;
  }

  async request() {
    const { data } = await this.client.request.send<UserFeedResponse>({
      url: `/api/v1/feed/user/${this.id}/`,
      qs: {
        max_id: this.nextMaxId,
      },
    });
    this.state = data;
    return data;
  }

  async items() {
    const data = await this.request();
    return data.items;
  }
}
