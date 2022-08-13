/* tslint:disable */
/**
 * This file was automatically generated by Payload CMS.
 * DO NOT MODIFY IT BY HAND. Instead, modify your source Payload config,
 * and re-run `payload generate:types` to regenerate this file.
 */

export interface Config {}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "users".
 */
export interface User {
  id: string;
  relation?: string | LocalizedPost;
  email?: string;
  resetPasswordToken?: string;
  resetPasswordExpiration?: string;
  loginAttempts?: number;
  lockUntil?: string;
  createdAt: string;
  updatedAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "localized-posts".
 */
export interface LocalizedPost {
  id: string;
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "localized-required".
 */
export interface LocalizedRequired {
  id: string;
  title: string;
  layout: (
    | {
        text?: string;
        id?: string;
        blockName?: string;
        blockType: 'text';
      }
    | {
        number?: number;
        id?: string;
        blockName?: string;
        blockType: 'number';
      }
  )[];
  createdAt: string;
  updatedAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "with-localized-relationship".
 */
export interface WithLocalizedRelationship {
  id: string;
  localizedRelationship?: string | LocalizedPost;
  localizedRelationHasManyField?: (string | LocalizedPost)[];
  localizedRelationMultiRelationTo?:
    | {
        value: string | LocalizedPost;
        relationTo: 'localized-posts';
      }
    | {
        value: string | Dummy;
        relationTo: 'dummy';
      };
  localizedRelationMultiRelationToHasMany?: (
    | {
        value: string | LocalizedPost;
        relationTo: 'localized-posts';
      }
    | {
        value: string | Dummy;
        relationTo: 'dummy';
      }
  )[];
  createdAt: string;
  updatedAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "dummy".
 */
export interface Dummy {
  id: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}
