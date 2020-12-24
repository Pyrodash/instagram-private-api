import { Expose, plainToClassFromExist } from 'class-transformer';
import { Feed } from '../core/feed';
import { BestiesFeedResponse, BestiesFeedResponseUsersItem } from '../responses';

export class BestiesFeed extends Feed<BestiesFeedResponse, BestiesFeedResponseUsersItem> {
  @Expose()
  private nextMaxId: string;

  set state(data: BestiesFeedResponse) {
    this.moreAvailable = !!data.next_max_id;
    this.nextMaxId = data.next_max_id;
  }

  async request() {
    const { data } = await this.client.request.send<BestiesFeedResponse>({
      url: `/api/v1/friendships/besties`,
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
    return data.users.map(user => plainToClassFromExist(new BestiesFeedResponseUsersItem(this.client), user));
  }
}
