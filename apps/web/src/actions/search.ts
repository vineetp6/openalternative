"use server"

import { prisma } from "@openalternative/db"

export async function searchItems(query: string) {
  const [tools, alternatives, categories, licenses] = await Promise.all([
    prisma.tool.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      orderBy: { name: "asc" },
      take: 5,
    }),
    prisma.alternative.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      orderBy: { name: "asc" },
      take: 5,
    }),
    prisma.category.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      orderBy: { name: "asc" },
      take: 5,
    }),
    prisma.license.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      orderBy: { name: "asc" },
      take: 5,
    }),
  ])

  return {
    tools,
    alternatives,
    categories,
    licenses,
  }
}
