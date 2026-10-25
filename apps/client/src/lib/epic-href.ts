import { routes } from "./routes"

/** All tasks narrowed to one epic and its sub-cards. */
export const epicHref = (epicId: string) =>
  `${routes.global()}?epic=${encodeURIComponent(epicId)}`
