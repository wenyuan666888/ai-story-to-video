/**
 * 数据库类型（与 supabase/migrations 中的 schema 一致）
 * 开发流程：先设计表结构 → 写 SQL → 再写这里的类型
 */
export type ProjectStage = "draft" | "scenes" | "images" | "videos" | "completed";
export type ImageStatus = "pending" | "processing" | "completed" | "failed";
export type VideoStatus = "pending" | "processing" | "completed" | "failed";

export interface Project {
  id: string;
  user_id: string;
  title: string;
  story: string | null;
  style: string | null;
  stage: ProjectStage;
  final_video_path: string | null;
  final_video_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  order_index: number;
  description: string;
  description_confirmed: boolean;
  image_status: ImageStatus;
  image_confirmed: boolean;
  video_status: VideoStatus;
  video_confirmed: boolean;
  created_at: string;
}

export interface Image {
  id: string;
  scene_id: string;
  storage_path: string;
  url: string;
  width: number | null;
  height: number | null;
  version: number;
  created_at: string;
}

export interface Video {
  id: string;
  scene_id: string;
  storage_path: string;
  url: string;
  duration: number | null;
  task_id: string | null;
  version: number;
  created_at: string;
}

export interface SceneWithMedia extends Scene {
  images: Image[];
  videos: Video[];
}

export interface ProjectWithScenes extends Project {
  scenes: SceneWithMedia[];
}

// Supabase 用的 Database 类型（简化）
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: Omit<Project, "id" | "created_at" | "updated_at"> & Partial<Pick<Project, "id" | "created_at" | "updated_at">>;
        Update: Partial<Project>;
      };
      scenes: {
        Row: Scene;
        Insert: Omit<Scene, "id" | "created_at"> & Partial<Pick<Scene, "id" | "created_at">>;
        Update: Partial<Scene>;
      };
      images: {
        Row: Image;
        Insert: Omit<Image, "id" | "created_at"> & Partial<Pick<Image, "id" | "created_at">>;
        Update: Partial<Image>;
      };
      videos: {
        Row: Video;
        Insert: Omit<Video, "id" | "created_at"> & Partial<Pick<Video, "id" | "created_at">>;
        Update: Partial<Video>;
      };
    };
  };
}
