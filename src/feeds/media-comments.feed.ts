import { Expose } from 'class-transformer';
import { Feed } from '../core/feed';
import { MediaCommentsFeedResponse, MediaCommentsFeedResponseCommentsItem } from '../responses/';

export class MediaCommentsFeed extends Feed<MediaCommentsFeedResponse, MediaCommentsFeedResponseCommentsItem> {
  id: string;
  @Expose()
  private nextMaxId: string;
  @Expose()
  private nextMinId: string;

  set state(data: MediaCommentsFeedResponse) {
    this.moreAvailable = !!data.next_max_id || !!data.next_min_id;
    this.nextMaxId = data.next_max_id;
    this.nextMinId = data.next_min_id;
  }

  async request() {
    const { data } = await this.client.request.send<MediaCommentsFeedResponse>({
      url: `/api/v1/media/${this.id}/comments/`,
      qs: {
        can_support_threading: true,
        max_id: this.nextMaxId,
        min_id: this.nextMinId,
      },
    });
    this.state = data;
    return data;
  }

  async items() {
    const response = await this.request();
    return response.comments;
  }
}
