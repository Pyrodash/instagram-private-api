import { Expose, plainToClassFromExist } from 'class-transformer';
import { Feed } from '../core/feed';
import { NewsFeedResponseRootObject, NewsFeedResponseStoriesItem } from '../responses';

export class NewsFeed extends Feed<NewsFeedResponseRootObject, NewsFeedResponseStoriesItem> {
  @Expose()
  public nextMaxId: string | number;

  set state(data: NewsFeedResponseRootObject) {
    this.moreAvailable = !!data.next_max_id;
    this.nextMaxId = data.next_max_id;
  }

  async request() {
    const { data } = await this.client.request.send<NewsFeedResponseRootObject>({
      url: `/api/v1/news`,
      qs: {
        max_id: this.nextMaxId,
      },
    });
    this.state = data;
    return data;
  }

  async items() {
    const data = await this.request();
    return data.stories.map(user => plainToClassFromExist(new NewsFeedResponseStoriesItem(this.client), user));
  }
}
