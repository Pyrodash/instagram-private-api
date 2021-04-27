import { Expose, plainToClassFromExist } from 'class-transformer';
import { Feed } from '../core/feed';
import { PendingFriendshipsFeedResponse, PendingFriendshipsFeedResponseUsersItem } from '../responses';

export class PendingFriendshipsFeed extends Feed<
  PendingFriendshipsFeedResponse,
  PendingFriendshipsFeedResponseUsersItem
> {
  @Expose()
  public nextMaxId: string;

  set state(data: PendingFriendshipsFeedResponse) {
    this.moreAvailable = !!data.next_max_id;
    this.nextMaxId = data.next_max_id;
  }

  async request() {
    const { data } = await this.client.request.send<PendingFriendshipsFeedResponse>({
      url: `/api/v1/friendships/pending`,
      qs: {
        rank_token: this.rankToken,
        max_id: this.nextMaxId,
      },
    });
    this.state = data;
    return data;
  }

  async items() {
    const data = await this.request();
    return data.users.map(user =>
      plainToClassFromExist(new PendingFriendshipsFeedResponseUsersItem(this.client), user),
    );
  }
}
