export type CommentItem = {
  id: string
  taskId: string
  userId: string
  userName: string
  content: string
  createdAt: string
}

export type CreateCommentRequest = {
  content: string
}

export type UpdateCommentRequest = {
  content: string
}
