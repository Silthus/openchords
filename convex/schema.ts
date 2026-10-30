import { defineSchema } from "convex/server";
import { accessTables } from "./access";
import { catalogTables } from "./catalog";
import { libraryTables } from "./library";

export default defineSchema({
  ...accessTables,
  ...catalogTables,
  ...libraryTables,
});
