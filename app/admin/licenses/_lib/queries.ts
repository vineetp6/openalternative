import type { Prisma } from "@prisma/client"
import type { SearchParams } from "algoliasearch"
import { endOfDay, startOfDay } from "date-fns"
import { prisma } from "~/services/prisma"
import { searchParamsSchema } from "./validations"

export const getLicenses = async (searchParams: Promise<SearchParams>) => {
  const search = searchParamsSchema.parse(await searchParams)
  const { page, per_page, sort, name, operator, from, to } = search

  // Offset to paginate the results
  const offset = (page - 1) * per_page

  // Column and order to sort by
  // Spliting the sort string by "." to get the column and order
  // Example: "title.desc" => ["title", "desc"]
  const [column, order] = (sort?.split(".").filter(Boolean) ?? ["name", "asc"]) as [
    keyof Prisma.LicenseOrderByWithRelationInput | undefined,
    "asc" | "desc" | undefined,
  ]

  // Convert the date strings to date objects
  const fromDate = from ? startOfDay(new Date(from)) : undefined
  const toDate = to ? endOfDay(new Date(to)) : undefined

  const where: Prisma.LicenseWhereInput = {
    // Filter by name
    name: name ? { contains: name, mode: "insensitive" } : undefined,

    // Filter by createdAt
    createdAt: {
      gte: fromDate,
      lte: toDate,
    },
  }

  // Transaction is used to ensure both queries are executed in a single transaction
  const [licenses, licensesTotal] = await prisma.$transaction([
    prisma.license.findMany({
      where,
      orderBy: column ? { [column]: order } : undefined,
      take: per_page,
      skip: offset,
    }),

    prisma.license.count({
      where,
    }),
  ])

  const pageCount = Math.ceil(licensesTotal / per_page)
  return { licenses, licensesTotal, pageCount }
}

export const getTools = async () => {
  return prisma.tool.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

export const getLicenseBySlug = async (slug: string) => {
  return prisma.license.findUnique({
    where: { slug },
  })
}
