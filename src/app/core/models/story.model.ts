export interface Story {
  _id: string;
  title: string;
  videoUrl: string;
  posterUrl: string;
  productLink: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoryListResponse {
  success: boolean;
  data: Story[];
}
