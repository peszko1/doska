import { routes } from "./routes"

/** The global board, filtered to one tag. */
export const tagBoardHref = (name: string) =>
  `${routes.global()}?${new URLSearchParams({ tag: name })}`
