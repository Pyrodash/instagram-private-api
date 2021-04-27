import { Feed } from '../core/feed';
import { Expose } from 'class-transformer';
import { UsertagsFeedResponseItemsItem, UsertagsFeedResponseRootObject } from '../responses';

export class UsertagsFeed extends Feed<UsertagsFeedResponseRootObject, UsertagsFeedResponseItemsItem> {
  id: number | string;
  @Expose()
  public nextMaxId: string;

  protected set state(data: UsertagsFeedResponseRootObject) {
    this.moreAvailable = data.more_available;
    this.nextMaxId = data.next_max_id;
  }

  async request() {
    const { data } = await this.client.request.send<UsertagsFeedResponseRootObject>({
      url: `/api/v1/usertags/${this.id}/feed/`,
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
