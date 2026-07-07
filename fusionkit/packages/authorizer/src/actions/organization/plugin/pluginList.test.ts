import { describe, expect, it } from "vitest";
import { pluginOrganizationListAction } from "./pluginListAction";
import { dummyConfFixture } from "@fushion/authorizer/src";
import { actionsTestWrapper } from "@/../../../../tests/actions-test-wrapper";
import { APP_ROUTES, BREADCRUMBS } from "@fushion/authorizer/src";
import { createMockActionContext } from "@/tests/create-action-context-mock";

const { validPluginListForaceParams } = APP_ROUTES;
const { expectedOrganizationId } = BREADCRUMBS;

const getDefaultInput = () => ({
  pluginPage: {
    ...validPluginListForaceParams,
    query: {},
  },
});

describe("pluginOrganizationListAction", () => {
  it("returns the plugin list aligned to the confixture", async () => {
    const response = await actionsTestWrapper({
      key: pluginOrganizationListAction,
      context: createMockActionContext({
        input: getDefaultInput(),
        authorizerInternalPlugins: dummyConfFixture,
      }),
    });
    expect(response.items).toEqual(
      dummyConfFixture.map((plugin) => ({
        id: plugin.id ?? 0,
        key: plugin.key,
        displayName: plugin.displayName ?? plugin.key,
        version: plugin.version ?? "0.0.0",
        description: plugin.description ?? "",
        enabled: plugin.enabled ?? false,
      }))
    );
  });

  it("provides pagination metadata consistent with the list", async () => {
    const response = await actionsTestWrapper({
      key: pluginOrganizationListAction,
      context: createMockActionContext({
        input: getDefaultInput(),
        authorizerInternalPlugins: dummyConfFixture,
      }),
    });
    expect(response.pageData).toEqual({
      isNextPageAvailable: false,
      page: 1,
      perPage: 20,
      totalEntries: dummyConfFixture.length,
      totalPages: 1,
    });
  });

  it("returns an empty list and not an error when the plugin key is not found", async () => {
    const response = await actionsTestWrapper({
      key: pluginOrganizationListAction,
      context: createMockActionContext({
        input: {
          ...getDefaultInput(),
          pluginPage: {
            ...getDefaultInput().pluginPage,
            pluginKey: "plugin.invalid.plugin",
          },
        },
      }),
    });
    expect(response.items).toEqual([]);
    expect(response.pageData).toEqual({
      isNextPageAvailable: false,
      page: 1,
      perPage: 20,
      totalEntries: 0,
      totalPages: 0,
    });
  });

  it("redirects to /organizations when the plugin is configured for a different organization", async () => {
    const responsePromise = actionsTestWrapper({
      key: pluginOrganizationListAction,
      context: createMockActionContext({
        input: {
          pluginPage: {
            ...validPluginListForaceParams,
            query: {},
            pluginKey: "plugin.core.ui-app-context",
          },
        },
        authorizeOrganizationsByUser: [
          {
            organization: {
              contextId: expectedOrganizationId,
              organization: {
                id: 100,
              },
            },
            authorized: true,
          },
        ],
        authorizerInternalPlugins: [
          {
            ...dummyConfFixture[0],
            organizationId: expectedOrganizationId + 1,
            pluginFqn: "plugin.core.ui-app-context",
          },
        ],
      }),
    });

    expect(responsePromise).rejects.toMatchInlineSnapshot(
      "[OFFICETUTOR-18467] Non-redirected error"
    );

    try {
      await responsePromise;
    } catch (error) {
      expect((error as Error).message).toContain(
        `Plugin key plugin.core.ui-app-context is not configured for this organization.`
      );
    }
  });
});
