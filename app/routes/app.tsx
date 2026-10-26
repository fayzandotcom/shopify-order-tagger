import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { isRouteErrorResponse, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import { planSelectionUrlFor, shopHasActivePlan } from "../subscription.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, redirect, session } = await authenticate.admin(request);

  // Without an active Standard plan (or trial), send the merchant to Shopify's
  // plan selection page. It's outside the app, so it needs target _top.
  const planUrl = planSelectionUrlFor(session.shop);
  if (
    planUrl &&
    !(await shopHasActivePlan(admin, session.shop, { allowCachedInactive: false }))
  ) {
    throw redirect(planUrl, { target: "_top" });
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/rules">Rules</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
// Same as boundary.error, but it checks the error with isRouteErrorResponse.
// boundary.error checks the class name, which the production build shortens,
// so redirects such as the one to the plan page flashed React Router's
// default error page ("200") in the browser.
export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return <div dangerouslySetInnerHTML={{ __html: error.data || "Handling response" }} />;
  }
  throw error;
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
