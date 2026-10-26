import type { MetaFunction } from "react-router";

import { COMPANY } from "../../company";
import styles from "./styles.module.css";

// Public privacy policy, linked from the App Store listing. Keep it in sync
// with what the app actually processes and stores (see AGENTS.md). Company and
// contact details live in app/company.ts. Update the date when the policy changes.
const EFFECTIVE_DATE = "October 26, 2026";

export const meta: MetaFunction = () => [{ title: "Privacy policy · Taggly" }];

export default function Privacy() {
  return (
    <main className={styles.page}>
      <h1>Taggly privacy policy</h1>
      <p className={styles.muted}>Effective {EFFECTIVE_DATE}</p>

      <p>
        Taggly (&quot;the app&quot;) is a Shopify app created and operated
        by <a href={COMPANY.url}>{COMPANY.name}</a> (&quot;we&quot;,
        &quot;us&quot;). It adds tags to new orders in a
        merchant&apos;s Shopify store, based on rules the merchant creates. This
        policy explains what information the app processes, why, and how long
        it&apos;s kept.
      </p>

      <h2>Information we process</h2>
      <h3>Store information</h3>
      <p>
        When a merchant installs the app, Shopify gives us the store&apos;s
        domain and an access token, which the app uses to work with that
        store through Shopify&apos;s API. We don&apos;t store details about
        the merchant&apos;s staff accounts.
      </p>

      <h3>Rules</h3>
      <p>
        The tagging rules a merchant creates in the app: a condition (order
        total, product tag or discount code), a value and a tag.
      </p>

      <h3>Order information</h3>
      <p>
        When a new order is created, Shopify sends the order to the app. To
        decide which tags to add, the app uses only the order total, the
        products in the order and their product tags, and the discount codes
        used. For each order the app tags, we store the order ID, the order
        number, the tags added, the rules that matched and the time, so the
        merchant can see a history of tagged orders.
      </p>
      <p>
        We do not use or store customers&apos; names, email addresses, phone
        numbers or addresses. The order data Shopify sends can include them,
        but the app ignores them.
      </p>

      <h3>Server logs</h3>
      <p>
        To operate and troubleshoot the app, our server logs record basic order
        details (order ID and number, order total, product titles, quantities
        and prices, and discount codes) and the tags added. Logs don&apos;t
        include customer contact details, and our hosting provider keeps them
        for a limited time.
      </p>

      <h2>How we use information</h2>
      <p>
        We use this information only to provide the app: evaluating the
        merchant&apos;s rules, adding tags to orders, and showing the tagging
        history in the app. We don&apos;t sell information, use it for
        advertising, or share it with anyone except the service providers
        below.
      </p>

      <h2>Service providers</h2>
      <ul>
        <li>
          <strong>Shopify</strong>: the platform the app runs on. Shopify
          sends the app store and order information, handles billing for the
          app&apos;s plan, and tells us whether a store has an active plan.
        </li>
        <li>
          <strong>Render</strong>: hosts the app and its database in the
          United States.
        </li>
      </ul>

      <h2>Retention and deletion</h2>
      <ul>
        <li>
          Rules and the tagging history are kept while the app is installed. A
          merchant can delete rules at any time in the app.
        </li>
        <li>
          If a store&apos;s plan ends or isn&apos;t started, the app stops
          tagging its orders. We keep the store&apos;s rules and tagging
          history for 30 days. If the app is still installed and a paid plan
          hasn&apos;t been started by then, we delete them.
        </li>
        <li>
          When a merchant uninstalls the app, Shopify asks us 48 hours later to
          delete the store&apos;s data. We then delete all of the store&apos;s
          rules, tagging history and access tokens.
        </li>
        <li>
          When Shopify sends us a customer data request, we report which of the
          customer&apos;s orders are in the tagging history. When Shopify sends
          a customer redaction request, we delete those orders from the
          history.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        Information is sent to and from the app over HTTPS, and our database
        is encrypted at rest (AES-256). Access to the app&apos;s systems is
        limited to the people who operate it.
      </p>

      <h2>Your rights</h2>
      <p>
        Merchants can contact us to ask about, correct or delete their
        store&apos;s data. Customers of a store should contact that store; we
        act on the requests Shopify forwards to us as described above.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we&apos;ll update it on this page and change
        the effective date above.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data:{" "}
        <a href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a>
      </p>
    </main>
  );
}
