import { type NextRequest, NextResponse } from "next/server";

/**
 * API Documentation endpoint
 * Returns OpenAPI/Swagger specification for the Regula API
 */
export async function GET(request: NextRequest) {
  const baseUrl =
    request.nextUrl.origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const openApiSpec = {
    openapi: "3.0.0",
    info: {
      title: "Regula API",
      version: "1.0.0",
      description:
        "API for programmatic access to Regula regulatory monitoring platform",
      contact: {
        name: "Regula Support",
        email: "support@regula.mushoodhanif.com",
      },
    },
    servers: [
      {
        url: baseUrl,
        description: "Production server",
      },
    ],
    paths: {
      "/api/alerts": {
        get: {
          summary: "List alerts",
          description: "Get a list of alerts for an organization",
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
          parameters: [
            {
              name: "organizationId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: ["new", "triaged", "actioned", "closed"],
              },
            },
            {
              name: "severity",
              in: "query",
              schema: {
                type: "string",
                enum: ["low", "medium", "high"],
              },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 100 },
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", default: 0 },
            },
          ],
          responses: {
            "200": {
              description: "List of alerts",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      alerts: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Alert" },
                      },
                      total: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/alerts/{id}": {
        get: {
          summary: "Get alert details",
          description: "Get detailed information about a specific alert",
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "organizationId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Alert details",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AlertDetail" },
                },
              },
            },
          },
        },
      },
      "/api/analytics": {
        get: {
          summary: "Get analytics data",
          description: "Get analytics and statistics for an organization",
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
          parameters: [
            {
              name: "organizationId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "type",
              in: "query",
              required: true,
              schema: {
                type: "string",
                enum: ["trends", "statistics", "health", "usage"],
              },
            },
          ],
          responses: {
            "200": {
              description: "Analytics data",
            },
          },
        },
      },
      "/api/api-keys": {
        get: {
          summary: "List API keys",
          description: "Get all API keys for an organization",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: "organizationId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "List of API keys",
            },
          },
        },
        post: {
          summary: "Create API key",
          description: "Create a new API key for programmatic access",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    organizationId: { type: "string" },
                    name: { type: "string" },
                    scopes: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "API key created",
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Alert: {
          type: "object",
          properties: {
            id: { type: "string" },
            organizationId: { type: "string" },
            targetId: { type: "string" },
            summary: { type: "string" },
            impactScore: { type: "number" },
            status: {
              type: "string",
              enum: ["new", "triaged", "actioned", "closed"],
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        AlertDetail: {
          type: "object",
          allOf: [
            { $ref: "#/components/schemas/Alert" },
            {
              type: "object",
              properties: {
                target: { type: "object" },
                version: { type: "object" },
                assignments: { type: "array" },
                comments: { type: "array" },
              },
            },
          ],
        },
      },
    },
  };

  return NextResponse.json(openApiSpec);
}
