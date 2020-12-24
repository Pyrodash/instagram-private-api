import { Expose, plainToClassFromExist } from 'class-transformer';
import { Feed } from '../core/feed';
import { AccountFollowersFeedResponse, AccountFollowersFeedResponseUsersItem } from '../responses';

export class AccountFollowersFeed extends Feed<AccountFollowersFeedResponse, AccountFollowersFeedResponseUsersItem> {
  searchSurface?: string;
  /**
   * only 'default' seems to work
   */
  order?: 'default' = 'default';
  query = '';
  enableGroups = true;

  id: number | string;
  @Expose()
  public nextMaxId: string;

  set state(data: AccountFollowersFeedResponse) {
    this.moreAvailable = !!data.next_max_id;
    this.nextMaxId = data.next_max_id;
  }

  async request() {
    const { data } = await this.client.request.send<AccountFollowersFeedResponse>({
      url: `/api/v1/friendships/${this.id}/followers/`,
      qs: {
        max_id: this.nextMaxId,
        search_surface: this.searchSurface,
        order: this.order,
        query: this.query,
        enable_groups: this.enableGroups,
      },
    });
    this.state = data;
    return data;
  }

  async items() {
    const data = await this.request();
    return data.users.map(user => plainToClassFromExist(new AccountFollowersFeedResponseUsersItem(this.client), user));
  }
}
