import { Expose, plainToClassFromExist } from 'class-transformer';
import { Feed } from '../core/feed';
import { DiscoverFeedResponseRootObject, DiscoverFeedResponseUser } from '../responses';

export class DiscoverFeed extends Feed<DiscoverFeedResponseRootObject, DiscoverFeedResponseUser> {
  @Expose()
  public nextMaxId: string;

  set state(data: DiscoverFeedResponseRootObject) {
    this.moreAvailable = data.more_available;
    this.nextMaxId = data.max_id;
  }

  async request() {
    const { data } = await this.client.request.send<DiscoverFeedResponseRootObject>({
      url: `/api/v1/discover/ayml/`,
      method: 'POST',
      form: {
        max_id: this.nextMaxId,
        phone_id: this.client.state.phoneId,
        module: 'discover_people',
        _uuid: this.client.state.uuid,
        _csrftoken: this.client.state.cookieCsrfToken,
        paginate: true,
      },
    });
    this.state = data;
    return data;
  }

  async items() {
    const data = await this.request();
    return data.suggested_users.suggestions.map(user =>
      plainToClassFromExist(new DiscoverFeedResponseUser(this.client), user),
    );
  }
}
