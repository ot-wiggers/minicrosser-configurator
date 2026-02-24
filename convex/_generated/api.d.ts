/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authInternal from "../authInternal.js";
import type * as baseModels from "../baseModels.js";
import type * as categories from "../categories.js";
import type * as colorVariantImages from "../colorVariantImages.js";
import type * as customers from "../customers.js";
import type * as documentVersions from "../documentVersions.js";
import type * as documents from "../documents.js";
import type * as files from "../files.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_roles from "../lib/roles.js";
import type * as optionGroups from "../optionGroups.js";
import type * as options from "../options.js";
import type * as outbox from "../outbox.js";
import type * as seedData from "../seedData.js";
import type * as sendEmail from "../sendEmail.js";
import type * as sequences from "../sequences.js";
import type * as sessions from "../sessions.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authInternal: typeof authInternal;
  baseModels: typeof baseModels;
  categories: typeof categories;
  colorVariantImages: typeof colorVariantImages;
  customers: typeof customers;
  documentVersions: typeof documentVersions;
  documents: typeof documents;
  files: typeof files;
  "lib/auth": typeof lib_auth;
  "lib/roles": typeof lib_roles;
  optionGroups: typeof optionGroups;
  options: typeof options;
  outbox: typeof outbox;
  seedData: typeof seedData;
  sendEmail: typeof sendEmail;
  sequences: typeof sequences;
  sessions: typeof sessions;
  settings: typeof settings;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
