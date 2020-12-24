import { Expose, plainToClassFromExist } from 'class-transformer';
import { Feed } from '../core/feed';
import { BlockedUsersFeedResponseRootObject, BlockedUsersFeedResponseBlockedListItem } from '../responses';

export class BlockedUsersFeed extends Feed<
  BlockedUsersFeedResponseRootObject,
  BlockedUsersFeedResponseBlockedListItem
> {
  @Expose()
  private nextMaxId: string;

  set state(data: BlockedUsersFeedResponseRootObject) {
    this.moreAvailable = !!data.next_max_id;
    this.nextMaxId = data.next_max_id;
  }

  async request() {
    const { data } = await this.client.request.send<BlockedUsersFeedResponseRootObject>({
      url: `/api/v1/users/blocked_list/`,
      qs: {
        max_id: this.nextMaxId,
      },
    });
    this.state = data;
    return data;
  }

  async items() {
    const data = await this.request();
    return data.blocked_list.map(user =>
      plainToClassFromExist(new BlockedUsersFeedResponseBlockedListItem(this.client), user),
    );
  }
}
