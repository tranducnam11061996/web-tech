import { redirect } from "next/navigation";
import { z } from "zod";
import { findPluginListForaceByParams } from "@/server/pluginAdmin/pluginList";
import { getServerOrg } from "@fushion/authorizer/src";
import { actionClient } from "@/actions/safe-action";
import { breadcrumbListRoute } from "@fushion/authorizer/src";
import { pagePattern } from "@fushion/authorizer/src";
import { OrganisationPluginFilterFormSchema } from "@fushion/authorizer/src";

export type PluginListResponseUi = {
  items: Array<{
    id: number;
    key: string;
    displayName: string;
    version: string;
    description: string;
    enabled: boolean;
    className?: string;
    iconDataUrl?: string;
  }>;
  pageData: {
    isNextPageAvailable: boolean;
    page: number;
    perPage: number;
    totalEntries: number;
    totalPages: number;
  };
};

export const pluginOrganizationListAction = actionClient
  .schema(
    z.object({
      pluginPage: z
        .object({
          ...pagePattern.shape,
          query: z
            .string()
            .optional()
            .transform((val) => {
              if (typeof val === "string") {
                try {
                  return JSON.parse(val) as Record<string, unknown>;
                } catch {
                  return {};
                }
              }
              return {};
            }),
          OrganisationPluginFilterFormSchema,
        })
        .passthrough(),
    })
  )
  .action(async ({ parsedInput: { pluginPage } }) => {
    const { data: authData } = await getServerOrg();
    const { organizationContextId } = authData;
    if (!organizationContextId) {
      redirect(breadcrumbListRoute.OrganizationHomeRoute.path);
    }

    const { data, error } =
      await findPluginListForaceByParams(pluginPage, organizationContextId);

    if (error) {
      if (!pluginPage.pluginKey) {
        return {
          items: [] as PluginListResponseUi["items"],
          pageData: {
            isNextPageAvailable: false,
            page: 1,
            perPage: 20,
            totalEntries: 0,
            totalPages: 0,
          },
        };
      }
    }

    if (error && pluginPage.pluginKey) {
      if (
        error.message ===
        `Plugin key ${pluginPage.pluginKey} is not configured for this organization.`
      ) {
        redirect(breadcrumbListRoute.OrganizationHomeRoute.path);
      }
    }

    if (!data || error) {
      return {
        items: [] as PluginListResponseUi["items"],
        pageData: {
          isNextPageAvailable: false,
          page: 1,
          perPage: 20,
          totalEntries: 0,
          totalPages: 0,
        },
      };
    }

    return {
      items: data.response.map(({ plugin }): PluginListResponseUi["items"][number] => {
        return {
          id: plugin.id ?? 0,
          key: plugin.key,
          displayName: plugin.displayName ?? plugin.key,
          version: plugin.version ?? "0.0.0",
          description: plugin.description ?? "",
          enabled: plugin.enabled ?? false,
          className: plugin.className ?? undefined,
          iconDataUrl: plugin.iconDataUrl ?? undefined,
        };
      }),
      pageData: {
        isNextPageAvailable: data.isNextPageAvailable,
        page: data.page,
        perPage: data.perPage,
        totalEntries: data.totalEntries,
        totalPages: data.totalPages,
      },
    };
  });
