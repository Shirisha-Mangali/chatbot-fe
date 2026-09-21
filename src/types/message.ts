export type Attachment = {
  mime_type: string;
  filename: string;
  data_base64: string;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  attachment_mime?: string | null;
  attachment_filename?: string | null;
  attachment_data?: string | null;
};

export type Conversation = {
  id: string;
  title: string | null;
  created_at: string;
};
