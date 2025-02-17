"use server"

import { slugify } from "@curiousleaf/utils"
import { prisma } from "@openalternative/db"
import { revalidateTag } from "next/cache"
import { createServerAction } from "zsa"
import { subscribeToNewsletter } from "~/actions/subscribe"
import { submitToolSchema } from "~/server/schemas"
import { inngest } from "~/services/inngest"
import { isRealEmail } from "~/utils/helpers"

/**
 * Generates a unique slug by adding a numeric suffix if needed
 */
const generateUniqueSlug = async (baseName: string): Promise<string> => {
  const baseSlug = slugify(baseName)
  let slug = baseSlug
  let suffix = 2

  while (true) {
    // Check if slug exists
    if (!(await prisma.tool.findUnique({ where: { slug } }))) {
      return slug
    }

    // Add/increment suffix and try again
    slug = `${baseSlug}-${suffix}`
    suffix++
  }
}

/**
 * Submit a tool to the database
 * @param input - The tool data to submit
 * @returns The tool that was submitted
 */
export const submitTool = createServerAction()
  .input(submitToolSchema)
  .handler(async ({ input }) => {
    const { newsletterOptIn, ...data } = input
    const isValidEmail = await isRealEmail(data.submitterEmail)

    if (!isValidEmail) {
      throw new Error("Invalid email address, please use a real one")
    }

    if (newsletterOptIn) {
      await subscribeToNewsletter({
        email: data.submitterEmail,
        utm_medium: "submit_form",
        double_opt_override: "off",
        send_welcome_email: false,
      })
    }

    // Check if the tool already exists
    const existingTool = await prisma.tool.findFirst({
      where: { OR: [{ repository: data.repository }, { website: data.website }] },
    })

    // If the tool exists, redirect to the tool or submit page
    if (existingTool) {
      return existingTool
    }

    // Generate a unique slug
    const slug = await generateUniqueSlug(data.name)

    // Save the tool to the database
    const tool = await prisma.tool.create({
      data: { ...data, slug },
    })

    // Send an event to the Inngest pipeline
    await inngest.send({ name: "tool.submitted", data: { slug } })

    // Revalidate cache
    revalidateTag("admin-tools")

    return tool
  })
