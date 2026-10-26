import type { LoaderFunctionArgs } from "react-router";

import { login } from "../../shopify.server";

// Reached when the app can't tell which shop a request is for. A request that
// includes ?shop= is redirected by login() to Shopify's install/auth flow.
// Otherwise, point the merchant to their Shopify admin instead of asking for a
// shop domain (App Store requirement 2.3.1).
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await login(request);
  return null;
};

export default function Auth() {
  return (
    <>
      <script src="https://cdn.shopify.com/shopifycloud/polaris.js" />
      <s-page>
        <s-section heading="Open Taggly from Shopify">
          <s-paragraph>
            Taggly runs inside your Shopify admin. Open it from Apps in
            your admin, or install it from the Shopify App Store.
          </s-paragraph>
        </s-section>
      </s-page>
    </>
  );
}
