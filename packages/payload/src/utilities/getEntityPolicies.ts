import type { PayloadT } from '..'
import type { CollectionPermission, GlobalPermission, User } from '../auth/types'
import type { SanitizedCollectionConfig, TypeWithID } from '../collections/config/types'
import type { Access } from '../config/types'
import type { FieldAccess } from '../fields/config/types'
import type { SanitizedGlobalConfig } from '../globals/config/types'
import type { AllOperations, Document, PayloadRequest, Where } from '../types'

import { tabHasName } from '../fields/config/types'

type Args = {
  entity: SanitizedCollectionConfig | SanitizedGlobalConfig
  id?: number | string
  operations: AllOperations[]
  req: Partial<PayloadRequest> & {
    data?: Record<string, unknown>
    payload: PayloadT
    user: User | null
  }
  type: 'collection' | 'global'
}

type ReturnType<T extends Args> = T['type'] extends 'global'
  ? GlobalPermission
  : CollectionPermission

type CreateAccessPromise = (args: {
  access: Access | FieldAccess
  accessLevel: 'entity' | 'field'
  disableWhere?: boolean
  operation: AllOperations
  policiesObj: {
    [key: string]: any
  }
}) => Promise<void>

export async function getEntityPolicies<T extends Args>(args: T): Promise<ReturnType<T>> {
  const { id, entity, operations, req, type } = args
  const { data, payload, user } = req
  const isLoggedIn = !!user

  const policies = {
    fields: {},
  } as ReturnType<T>

  let docBeingAccessed

  async function getEntityDoc({ where }: { where?: Where } = {}): Promise<TypeWithID & Document> {
    if (entity.slug) {
      if (type === 'global') {
        return payload.findGlobal({
          overrideAccess: true,
          // req, (REMOVED)
          slug: entity.slug,
        })
      }

      if (type === 'collection' && id) {
        if (typeof where === 'object') {
          const paginatedRes = await payload.find({
            collection: entity.slug,
            limit: 1,
            overrideAccess: true,
            // TODO: should we type find as a partial?
            req,
            where: {
              ...where,
              and: [
                ...(where.and || []),
                {
                  id: {
                    equals: id,
                  },
                },
              ],
            },
          })

          return paginatedRes?.docs?.[0] || undefined
        }

        return payload.findByID({
          id,
          collection: entity.slug,
          overrideAccess: true,
          // TODO: should we type findByID as a partial?
          req,
        })
      }
    }

    return undefined
  }

  const createAccessPromise: CreateAccessPromise = async ({
    access,
    accessLevel,
    disableWhere = false,
    operation,
    policiesObj,
  }) => {
    const mutablePolicies = policiesObj

    if (accessLevel === 'field' && docBeingAccessed === undefined) {
      docBeingAccessed = await getEntityDoc()
    }

    // https://payloadcms.slack.com/archives/C048Z9C2BEX/p1702054928343769
    const accessResult = await access({ id, data, doc: docBeingAccessed, payload, user })

    if (typeof accessResult === 'object' && !disableWhere) {
      mutablePolicies[operation] = {
        permission:
          id || type === 'global' ? !!(await getEntityDoc({ where: accessResult })) : true,
        where: accessResult,
      }
    } else if (mutablePolicies[operation]?.permission !== false) {
      mutablePolicies[operation] = {
        permission: !!accessResult,
      }
    }
  }

  const executeFieldPolicies = async ({ entityPermission, fields, operation, policiesObj }) => {
    const mutablePolicies = policiesObj.fields

    await Promise.all(
      fields.map(async (field) => {
        if (field.name) {
          if (!mutablePolicies[field.name]) mutablePolicies[field.name] = {}

          if (field.access && typeof field.access[operation] === 'function') {
            await createAccessPromise({
              access: field.access[operation],
              accessLevel: 'field',
              disableWhere: true,
              operation,
              policiesObj: mutablePolicies[field.name],
            })
          } else {
            mutablePolicies[field.name][operation] = {
              permission: policiesObj[operation]?.permission,
            }
          }

          if (field.fields) {
            if (!mutablePolicies[field.name].fields) mutablePolicies[field.name].fields = {}

            await executeFieldPolicies({
              entityPermission,
              fields: field.fields,
              operation,
              policiesObj: mutablePolicies[field.name],
            })
          }

          if (field?.blocks) {
            if (!mutablePolicies[field.name]?.blocks) mutablePolicies[field.name].blocks = {}

            await Promise.all(
              field.blocks.map(async (block) => {
                if (!mutablePolicies[field.name].blocks?.[block.slug]) {
                  mutablePolicies[field.name].blocks[block.slug] = {
                    fields: {},
                    [operation]: { permission: entityPermission },
                  }
                } else if (!mutablePolicies[field.name].blocks[block.slug][operation]) {
                  mutablePolicies[field.name].blocks[block.slug][operation] = {
                    permission: entityPermission,
                  }
                }

                await executeFieldPolicies({
                  entityPermission,
                  fields: block.fields,
                  operation,
                  policiesObj: mutablePolicies[field.name].blocks[block.slug],
                })
              }),
            )
          }
        } else if (field.fields) {
          await executeFieldPolicies({
            entityPermission,
            fields: field.fields,
            operation,
            policiesObj,
          })
        } else if (field.type === 'tabs') {
          await Promise.all(
            field.tabs.map(async (tab) => {
              if (tabHasName(tab)) {
                if (!mutablePolicies[tab.name]) {
                  mutablePolicies[tab.name] = {
                    fields: {},
                    [operation]: { permission: entityPermission },
                  }
                } else if (!mutablePolicies[tab.name][operation]) {
                  mutablePolicies[tab.name][operation] = { permission: entityPermission }
                }
                await executeFieldPolicies({
                  entityPermission,
                  fields: tab.fields,
                  operation,
                  policiesObj: mutablePolicies[tab.name],
                })
              } else {
                await executeFieldPolicies({
                  entityPermission,
                  fields: tab.fields,
                  operation,
                  policiesObj,
                })
              }
            }),
          )
        }
      }),
    )
  }

  await operations.reduce(async (priorOperation, operation) => {
    await priorOperation

    let entityAccessPromise: Promise<void>

    if (typeof entity.access[operation] === 'function') {
      entityAccessPromise = createAccessPromise({
        access: entity.access[operation],
        accessLevel: 'entity',
        operation,
        policiesObj: policies,
      })
    } else {
      policies[operation] = {
        permission: isLoggedIn,
      }
    }

    await entityAccessPromise

    await executeFieldPolicies({
      entityPermission: policies[operation].permission,
      fields: entity.fields,
      operation,
      policiesObj: policies,
    })
  }, Promise.resolve())

  return policies
}
